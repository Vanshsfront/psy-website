#!/usr/bin/env node
// Cleanup customer + order duplicates introduced by earlier runs of import-masterhub.mjs.
// For each group of name-only customers (no phone, no instagram, same name):
//   - keep the oldest record as canonical
//   - re-parent all orders from dupes onto canonical
//   - delete true duplicate orders (same customer_id, order_date, total, service_description)
//   - delete the now-empty dupe customer rows
// Usage: SUPABASE_URL=... SUPABASE_KEY=... node scripts/cleanup-masterhub-dupes.mjs [--dry-run|--live]
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing SUPABASE_URL/SUPABASE_KEY"); process.exit(1); }

const LIVE = process.argv.includes("--live");
const DRY = !LIVE;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function selectAll(table, columns) {
  let from = 0, all = [];
  while (true) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

(async () => {
  console.log(`Mode: ${DRY ? "DRY-RUN" : "LIVE"}`);

  const customers = await selectAll("customers", "id, name, phone, instagram, created_at");
  console.log(`customers loaded: ${customers.length}`);

  // Group name-only (no phone, no instagram) by lower(name), excluding Walk-in placeholder
  const groups = new Map();
  for (const c of customers) {
    if (c.phone || c.instagram) continue;
    const name = (c.name || "").trim();
    if (!name || name.toLowerCase() === "walk-in") continue;
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1);
  console.log(`duplicate groups: ${dupGroups.length}`);
  if (dupGroups.length === 0) return;

  // For each group: canonical = oldest by created_at
  const merges = []; // { canonical, dupes: [] }
  for (const [name, list] of dupGroups) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const [canonical, ...dupes] = list;
    merges.push({ name, canonical, dupes });
  }

  const dupIds = merges.flatMap((m) => m.dupes.map((d) => d.id));
  console.log(`duplicate customer records to merge away: ${dupIds.length}`);

  // Fetch all orders for dup customer ids
  const orders = [];
  for (let i = 0; i < dupIds.length; i += 100) {
    const chunk = dupIds.slice(i, i + 100);
    const { data, error } = await sb.from("orders").select("id, customer_id, order_date, total, service_description").in("customer_id", chunk);
    if (error) throw new Error(`orders fetch: ${error.message}`);
    orders.push(...data);
  }
  console.log(`orders attached to dupes: ${orders.length}`);

  // Fetch all orders for canonicals so we know what already exists
  const canonIds = merges.map((m) => m.canonical.id);
  const canonOrders = [];
  for (let i = 0; i < canonIds.length; i += 100) {
    const chunk = canonIds.slice(i, i + 100);
    const { data, error } = await sb.from("orders").select("id, customer_id, order_date, total, service_description").in("customer_id", chunk);
    if (error) throw new Error(`canon orders fetch: ${error.message}`);
    canonOrders.push(...data);
  }

  // Build canonical's existing order key set (to detect collisions)
  const key = (cid, d, t, s) => `${cid}|${d}|${Number(t)}|${s || ""}`;
  const canonSet = new Set(canonOrders.map((o) => key(o.customer_id, o.order_date, o.total, o.service_description)));

  // dup customer -> canonical customer map
  const dupToCanon = new Map();
  for (const m of merges) for (const d of m.dupes) dupToCanon.set(d.id, m.canonical.id);

  // Classify each dup-attached order
  const reparentIds = []; // orders to update customer_id
  const deleteIds = [];   // orders to delete (true duplicate of a canonical row)
  for (const o of orders) {
    const canonId = dupToCanon.get(o.customer_id);
    const collisionKey = key(canonId, o.order_date, o.total, o.service_description);
    if (canonSet.has(collisionKey)) {
      deleteIds.push(o.id);
    } else {
      reparentIds.push(o.id);
      canonSet.add(collisionKey); // dedup among dup-orders themselves
    }
  }
  console.log(`orders to re-parent:     ${reparentIds.length}`);
  console.log(`orders to delete (dup):  ${deleteIds.length}`);

  if (DRY) {
    console.log("\nSample merges:");
    for (const m of merges.slice(0, 5)) {
      console.log(`  ${m.name}: keep ${m.canonical.id} (${m.canonical.created_at}), drop ${m.dupes.map((d) => d.id).join(", ")}`);
    }
    console.log("\nDry-run: no writes. Re-run with --live to apply.");
    return;
  }

  // LIVE: re-parent, then delete dup orders, then delete dup customers
  console.log("\nApplying changes...");

  // Re-parent: UPDATE orders SET customer_id = canonical WHERE id IN (...)
  // Use the per-order canonical lookup: group reparentIds by target customer for efficiency
  const reparentByCanon = new Map();
  const orderById = new Map(orders.map((o) => [o.id, o]));
  for (const oid of reparentIds) {
    const o = orderById.get(oid);
    const canonId = dupToCanon.get(o.customer_id);
    if (!reparentByCanon.has(canonId)) reparentByCanon.set(canonId, []);
    reparentByCanon.get(canonId).push(oid);
  }
  let reparented = 0;
  for (const [canonId, ids] of reparentByCanon) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await sb.from("orders").update({ customer_id: canonId }).in("id", chunk);
      if (error) throw new Error(`reparent: ${error.message}`);
      reparented += chunk.length;
    }
  }
  console.log(`  re-parented ${reparented} orders`);

  // Delete duplicate orders
  let deleted = 0;
  for (let i = 0; i < deleteIds.length; i += 100) {
    const chunk = deleteIds.slice(i, i + 100);
    const { error } = await sb.from("orders").delete().in("id", chunk);
    if (error) throw new Error(`delete orders: ${error.message}`);
    deleted += chunk.length;
  }
  console.log(`  deleted ${deleted} duplicate orders`);

  // Delete duplicate customers (should now have no orders pointing to them)
  let deletedCust = 0;
  for (let i = 0; i < dupIds.length; i += 100) {
    const chunk = dupIds.slice(i, i + 100);
    const { error } = await sb.from("customers").delete().in("id", chunk);
    if (error) throw new Error(`delete customers: ${error.message}`);
    deletedCust += chunk.length;
  }
  console.log(`  deleted ${deletedCust} duplicate customer rows`);

  console.log("\nDone.");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
