#!/usr/bin/env node
// One-shot importer: Psy Tattoos Masterhub 2025-26.xlsx -> Studio Supabase
// Usage: SUPABASE_URL=... SUPABASE_KEY=... node scripts/import-masterhub.mjs [--dry-run|--live]
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = process.env.MASTERHUB_PATH || "/Users/vanshsood/Downloads/Psy Tattoos Masterhub 2025-26.xlsx";
const SHEET_NAMES = (process.env.SHEET_NAMES || "Business").split(",").map((s) => s.trim()).filter(Boolean);
const PREVIEW_PATH = join(__dirname, "import-masterhub-preview.json");

const LIVE = process.argv.includes("--live");
const DRY = process.argv.includes("--dry-run") || !LIVE;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY env vars");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// --- helpers ---
const normPhone = (v) => {
  if (v === null || v === undefined) return null;
  const digits = String(v).replace(/\.0+$/, "").replace(/\D/g, "");
  return digits.length ? digits : null;
};
const normInsta = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/^@+/, "").trim();
  return s.length ? s : null;
};
const capitalizeWords = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const normName = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? capitalizeWords(s.toLowerCase()) : null;
};
const normService = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};
const normPayment = (v) => {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "upi") return "UPI";
  if (s === "cash") return "Cash";
  if (s === "card") return "Card";
  return null;
};
const normSource = (v) => {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  const map = {
    "walk - in": "walk-in",
    "walk-in": "walk-in",
    "walk in": "walk-in",
    "reference": "referral",
    "referral": "referral",
    "friends / family": "referral",
    "friends/family": "referral",
    "instagram": "instagram",
    "google": "google",
    "old client": null,
  };
  return s in map ? map[s] : null;
};
const normDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) {
    // Avoid UTC shift: use the local Y/M/D the sheet author sees.
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
const normNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const trimOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

async function selectAll(table, columns, pageSize = 1000) {
  let from = 0;
  const all = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function batchInsert(table, rows, chunk = 200) {
  const inserted = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { data, error } = await sb.from(table).insert(slice).select();
    if (error) throw new Error(`insert ${table} chunk ${i}: ${error.message}`);
    inserted.push(...(data || []));
  }
  return inserted;
}

// --- main ---
(async () => {
  console.log(`Mode: ${DRY ? "DRY-RUN (no writes)" : "LIVE"}`);
  console.log(`Source: ${XLSX_PATH}`);
  console.log(`Target: ${SUPABASE_URL}`);

  // 1. Preload
  console.log("\n[1/5] Preloading DB state...");
  const artists = await selectAll("artists", "id, name, is_active");
  const artistByLowerName = new Map(artists.map((a) => [a.name.trim().toLowerCase(), a.id]));
  console.log(`  artists: ${artists.length}`);

  let createdKshipra = false;
  if (!artistByLowerName.has("kshipra")) {
    if (DRY) {
      console.log("  would create artist: Kshipra");
    } else {
      const { data, error } = await sb
        .from("artists")
        .insert({ name: "Kshipra", is_active: true })
        .select()
        .single();
      if (error) throw new Error(`create Kshipra: ${error.message}`);
      artistByLowerName.set("kshipra", data.id);
      createdKshipra = true;
      console.log(`  created artist Kshipra (${data.id})`);
    }
  }

  const customers = await selectAll("customers", "id, name, phone, instagram");
  console.log(`  customers: ${customers.length}`);

  const byPhone = new Map(); // phone -> [{id, name}]
  const byInsta = new Map(); // insta lower -> id (first wins)
  const byName = new Map();  // name lower -> [{id, phone}]
  for (const c of customers) {
    if (c.phone) {
      const p = normPhone(c.phone);
      if (p) {
        if (!byPhone.has(p)) byPhone.set(p, []);
        byPhone.get(p).push({ id: c.id, name: (c.name || "").trim().toLowerCase() });
      }
    }
    if (c.instagram) {
      const i = c.instagram.trim().toLowerCase();
      if (!byInsta.has(i)) byInsta.set(i, c.id);
    }
    if (c.name) {
      const n = c.name.trim().toLowerCase();
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n).push({ id: c.id, phone: c.phone ? normPhone(c.phone) : null });
    }
  }

  // Walk-in placeholder
  let walkInId = null;
  const walkInExisting = customers.find(
    (c) => (c.name || "").trim().toLowerCase() === "walk-in" && !c.phone
  );
  if (walkInExisting) {
    walkInId = walkInExisting.id;
    console.log(`  Walk-in customer already exists: ${walkInId}`);
  } else {
    if (DRY) {
      walkInId = "__WALK_IN_PLACEHOLDER__";
      console.log("  would create Walk-in customer");
    } else {
      const { data, error } = await sb
        .from("customers")
        .insert({ name: "Walk-in", phone: null, instagram: null, email: null, source: null, notes: "Auto-created for anonymous studio sales (jewellery / stud walk-ins)" })
        .select()
        .single();
      if (error) throw new Error(`create Walk-in: ${error.message}`);
      walkInId = data.id;
      console.log(`  created Walk-in customer: ${walkInId}`);
    }
  }

  // Existing orders dedup set
  const existingOrders = await selectAll("orders", "customer_id, order_date, total, service_description");
  const orderKey = (customer_id, order_date, total, sd) =>
    `${customer_id}|${order_date}|${Number(total)}|${sd || ""}`;
  const existingSet = new Set(existingOrders.map((o) => orderKey(o.customer_id, o.order_date, o.total, o.service_description)));
  console.log(`  existing orders: ${existingOrders.length} (dedup keys built)`);

  // 2. Parse sheet(s)
  console.log(`\n[2/5] Parsing sheets: ${SHEET_NAMES.join(", ")}...`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);

  const parsed = [];
  const parseSheet = (ws, sheetName) => {
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const cell = (i) => {
      const c = row.getCell(i);
      if (!c) return null;
      const v = c.value;
      if (v === null || v === undefined) return null;
      if (typeof v === "object") {
        if (v instanceof Date) return v;
        if ("text" in v) return v.text; // rich text
        if ("result" in v) return v.result; // formula
        if ("richText" in v) return v.richText.map((r) => r.text).join("");
      }
      return v;
    };

    const rawDate = cell(1);
    const rawArtist = cell(2);
    const rawCust = cell(3);
    const rawPhone = cell(4);
    const rawInsta = cell(5);
    const rawService = cell(6);
    const rawMop = cell(7);
    const rawDeposit = cell(8);
    const rawTotal = cell(9);
    const rawComments = cell(10);
    const rawSource = cell(11);

    const name = normName(rawCust);
    const phone = normPhone(rawPhone);
    const insta = normInsta(rawInsta);
    const service = normService(rawService);
    const total = normNum(rawTotal);
    // Skip genuinely empty rows
    if (!name && !phone && !insta && !service && !total && !rawComments) return;

    parsed.push({
      sheet: sheetName,
      rowNumber,
      date: normDate(rawDate),
      artistName: rawArtist ? String(rawArtist).trim().toLowerCase() : null,
      name,
      phone,
      instagram: insta,
      service,
      payment_mode: normPayment(rawMop),
      deposit: normNum(rawDeposit),
      total,
      comments: trimOrNull(rawComments),
      source: normSource(rawSource),
    });
  });
  };
  for (const sheetName of SHEET_NAMES) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) throw new Error(`Sheet '${sheetName}' not found`);
    const before = parsed.length;
    parseSheet(ws, sheetName);
    console.log(`  '${sheetName}': ${parsed.length - before} meaningful rows`);
  }
  console.log(`  parsed rows total: ${parsed.length}`);

  // 3. Resolve customers
  console.log("\n[3/5] Resolving customers...");
  const newCustomers = []; // staged inserts, each with `key` for back-fill
  const rowAssignments = []; // parallel array: customer_id (or placeholder key)
  let matchedCust = 0, createdCust = 0, anonCust = 0;

  // Pick customer id by phone. The customers.phone column has a UNIQUE constraint,
  // so family phones collapse to one customer — same as the prior import. Prefer an
  // exact-name match within the bucket, otherwise fall back to the first.
  const pickPhoneMatch = (phone, name) => {
    const bucket = byPhone.get(phone);
    if (!bucket || bucket.length === 0) return null;
    if (name) {
      const low = name.toLowerCase();
      const exact = bucket.find((b) => b.name === low);
      if (exact) return exact.id;
    }
    return bucket[0].id;
  };

  for (const r of parsed) {
    // Anonymous row
    if (!r.name && !r.phone && !r.instagram) {
      rowAssignments.push({ customer_id: walkInId, anonymous: true });
      anonCust++;
      continue;
    }

    // Phone-first match
    if (r.phone) {
      const hit = pickPhoneMatch(r.phone, r.name);
      if (hit) {
        rowAssignments.push({ customer_id: hit });
        matchedCust++;
        continue;
      }
    } else if (r.instagram) {
      const hit = byInsta.get(r.instagram.toLowerCase());
      if (hit) {
        rowAssignments.push({ customer_id: hit });
        matchedCust++;
        continue;
      }
    } else if (r.name) {
      const bucket = byName.get(r.name.toLowerCase());
      if (bucket && bucket.length >= 1) {
        // For idempotency: pick the first match deterministically even when ambiguous.
        // Without phone/instagram we can't distinguish which real person the sheet row
        // refers to — and creating a new customer each run was generating dupes.
        rowAssignments.push({ customer_id: bucket[0].id });
        matchedCust++;
        continue;
      }
      // no existing with this name — fall through to create
    }

    // Need to create — but first, dedup within this run (in case sheet has the same new customer repeated)
    const runKey = [r.phone || "", r.instagram ? r.instagram.toLowerCase() : "", (r.name || "").toLowerCase()].join("|");
    const staged = newCustomers.find((x) => x._runKey === runKey);
    if (staged) {
      rowAssignments.push({ customer_id: null, stagedIndex: newCustomers.indexOf(staged) });
    } else {
      const payload = {
        name: r.name || "Unknown",
        phone: r.phone,
        instagram: r.instagram,
        email: null,
        source: r.source, // first occurrence wins
        notes: null,
      };
      newCustomers.push({ ...payload, _runKey: runKey });
      rowAssignments.push({ customer_id: null, stagedIndex: newCustomers.length - 1 });
      createdCust++;
      // also add to lookups so subsequent rows with the same phone/insta can match
      if (r.phone) {
        if (!byPhone.has(r.phone)) byPhone.set(r.phone, []);
        byPhone.get(r.phone).push({ id: `__STAGE_${newCustomers.length - 1}__`, name: (r.name || "").toLowerCase() });
      }
      if (r.instagram) byInsta.set(r.instagram.toLowerCase(), `__STAGE_${newCustomers.length - 1}__`);
      if (r.name) {
        const ln = r.name.toLowerCase();
        if (!byName.has(ln)) byName.set(ln, []);
        byName.get(ln).push({ id: `__STAGE_${newCustomers.length - 1}__`, phone: r.phone });
      }
    }
  }

  console.log(`  matched existing: ${matchedCust}`);
  console.log(`  staged new:       ${newCustomers.length} (unique)`);
  console.log(`  anonymous->Walk-in: ${anonCust}`);

  // 4. Insert new customers (live only)
  console.log("\n[4/5] Inserting new customers...");
  if (DRY) {
    console.log(`  dry-run: would insert ${newCustomers.length} customers`);
  } else if (newCustomers.length > 0) {
    const payloads = newCustomers.map(({ _runKey, ...p }) => p);
    const inserted = await batchInsert("customers", payloads, 100);
    if (inserted.length !== newCustomers.length) {
      throw new Error(`customer insert count mismatch: staged=${newCustomers.length} inserted=${inserted.length}`);
    }
    for (let i = 0; i < inserted.length; i++) {
      newCustomers[i].id = inserted[i].id;
    }
    console.log(`  inserted ${inserted.length} customers`);
  } else {
    console.log("  none to insert");
  }

  // Resolve final customer_ids for each row. Two sources of stage placeholders:
  //   1. rows that originally staged a new customer (via stagedIndex)
  //   2. later rows that matched an earlier staged customer via phone/insta/name lookup
  //      and ended up with a "__STAGE_N__" string customer_id
  const stageIdFromString = (s) => {
    const m = typeof s === "string" && s.match(/^__STAGE_(\d+)__$/);
    return m ? Number(m[1]) : null;
  };
  for (const ra of rowAssignments) {
    if (ra.customer_id === null && ra.stagedIndex !== undefined) {
      ra.customer_id = DRY ? `__STAGE_${ra.stagedIndex}__` : newCustomers[ra.stagedIndex].id;
    } else {
      const idx = stageIdFromString(ra.customer_id);
      if (idx !== null && !DRY) ra.customer_id = newCustomers[idx].id;
    }
  }

  // 5. Build + insert orders
  console.log("\n[5/5] Resolving + inserting orders...");
  const orderPayloads = [];
  let skippedExisting = 0, skippedDupInSheet = 0, artistUnknown = 0;
  const withinRunKeys = new Set();

  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i];
    const cid = rowAssignments[i].customer_id;
    if (!cid) continue; // should not happen

    if (!r.date) {
      // No usable date — skip silently (can't reconstruct an order).
      continue;
    }

    let artist_id = null;
    if (r.artistName) {
      artist_id = artistByLowerName.get(r.artistName) || null;
      if (!artist_id) artistUnknown++;
    }

    const key = orderKey(cid, r.date, r.total, r.service);

    // Against existing DB
    if (!String(cid).startsWith("__STAGE_") && existingSet.has(key)) {
      skippedExisting++;
      continue;
    }
    // Within this run (sheet has duplicates of the same transaction)
    if (withinRunKeys.has(key)) {
      skippedDupInSheet++;
      continue;
    }
    withinRunKeys.add(key);

    orderPayloads.push({
      customer_id: cid,
      artist_id,
      order_date: r.date,
      service_description: r.service,
      payment_mode: r.payment_mode,
      deposit: r.deposit,
      total: r.total,
      comments: r.comments,
      source: r.source,
    });
  }

  console.log(`  staged orders:           ${orderPayloads.length}`);
  console.log(`  skipped (already in DB): ${skippedExisting}`);
  console.log(`  skipped (dup in sheet):  ${skippedDupInSheet}`);
  console.log(`  artist not found:        ${artistUnknown}`);

  if (DRY) {
    // Write preview JSON
    const preview = {
      generatedAt: new Date().toISOString(),
      counts: {
        parsedRows: parsed.length,
        existingCustomersMatched: matchedCust,
        newCustomersStaged: newCustomers.length,
        anonymousRowsToWalkIn: anonCust,
        ordersStaged: orderPayloads.length,
        ordersSkippedAlreadyInDb: skippedExisting,
        ordersSkippedDupInSheet: skippedDupInSheet,
        kshipraWouldBeCreated: !artistByLowerName.has("kshipra") && !createdKshipra,
        walkInWouldBeCreated: !walkInExisting,
      },
      newCustomers: newCustomers.map(({ _runKey, ...c }) => c),
      orderSample: orderPayloads.slice(0, 20),
      orderTail: orderPayloads.slice(-20),
      staged: orderPayloads,
    };
    writeFileSync(PREVIEW_PATH, JSON.stringify(preview, null, 2));
    console.log(`\nDRY-RUN preview written to ${PREVIEW_PATH}`);
    console.log("Re-run with --live to commit changes.");
    return;
  }

  if (orderPayloads.length > 0) {
    const inserted = await batchInsert("orders", orderPayloads, 200);
    console.log(`  inserted ${inserted.length} orders`);
  } else {
    console.log("  no orders to insert");
  }

  console.log("\nDone.");
  console.log(
    `Summary: customers matched=${matchedCust} created=${newCustomers.length} anonymous->WalkIn=${anonCust} | orders inserted=${orderPayloads.length} skipped_existing=${skippedExisting} skipped_dup_in_sheet=${skippedDupInSheet}`
  );
})().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
