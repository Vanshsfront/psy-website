import { getDb, getFinancialSummary } from "@/lib/storeadmin/server/database";

/**
 * Monthly salary slips.
 *
 * Yogesh's rules, verbatim (2026-08-19):
 *
 *   Aaryan:  20k fixed + 10% of closed revenue
 *   Kshipra: 30k fixed + 10% of all google/instagram/facebook leads
 *   Sohel:   35k fixed + 20% of net profit
 *
 * They are per-person and unrelated to each other, so they live here as data
 * keyed by artist rather than as one formula with exceptions. Changing a
 * percentage, or adding a person, is an edit to SALARY_RULES and nothing else.
 *
 * These pay real people, so nothing here is inferred. Every ambiguity was put
 * back to Yogesh and answered before being implemented. The UNRESOLVED basis is
 * kept in the type as the mechanism for doing that again: a rule in that state
 * reports both candidate figures and pays neither, rather than quietly picking
 * one.
 */

export type SalaryRule =
  /** A percentage of the revenue on this artist's own orders. */
  | { kind: "own_orders"; percent: number; basis: "billed" | "collected" | "UNRESOLVED" }
  /** A percentage of studio revenue from customers who arrived via given channels. */
  | { kind: "channel_revenue"; percent: number; channels: string[] }
  /** A percentage of the studio's net profit, revenue minus expenses. */
  | { kind: "studio_net_profit"; percent: number };

export interface SalaryPlan {
  /** Matches studio.artists.name, which is the short working name. */
  artistName: string;
  fixed: number;
  rule: SalaryRule;
  /** Yogesh's own wording, kept so the slip can show what it is paying against. */
  statedAs: string;
}

export const SALARY_RULES: SalaryPlan[] = [
  {
    // Spelled "Aaryan" in the instruction; the record is "Aryan".
    artistName: "Aryan",
    fixed: 20000,
    // Clarified by Yogesh: "artist revenue - closed as in billed and payment
    // received (exclude future appointments booked, scheduled etc)".
    //
    // That is the `orders` table exactly. An order row is only written when an
    // appointment is completed, so bookings and scheduled work are excluded by
    // construction rather than by a filter: appointments live in their own
    // table and never reach revenue. `total` is the billed and settled amount.
    rule: { kind: "own_orders", percent: 10, basis: "billed" },
    statedAs: "20k fixed + 10% of closed revenue",
  },
  {
    artistName: "Kshipra",
    fixed: 30000,
    // Matched case-insensitively: the data holds both "google" and "Google",
    // both "instagram" and "Instagram". No record uses facebook at all, so that
    // channel contributes nothing until it appears in the data.
    rule: { kind: "channel_revenue", percent: 10, channels: ["google", "instagram", "facebook"] },
    statedAs: "30k fixed + 10% of all google/instagram/facebook leads",
  },
  {
    artistName: "Sohel",
    fixed: 35000,
    rule: { kind: "studio_net_profit", percent: 20 },
    statedAs: "35k fixed + 20% of net profit",
  },
];

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const PAGE = 1000;

/** Every order in the window for one artist. Paged, so totals cannot be capped. */
async function ordersForArtist(artistId: string, from: string, to: string) {
  const rows: Array<{ total: unknown; deposit: unknown }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await getDb()
      .from("orders")
      .select("id, total, deposit")
      .eq("artist_id", artistId)
      .gte("order_date", from)
      .lte("order_date", to)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Failed to read orders: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as unknown as typeof rows));
    if (data.length < PAGE) break;
  }
  return rows;
}

/**
 * Revenue in the window from customers who arrived via one of `channels`.
 *
 * Two steps rather than a join, because the channel lives on the customer and
 * the money lives on the order. Customer ids are chunked into the `in(...)`
 * filter so the request URL stays a sane length.
 */
async function revenueFromChannels(channels: string[], from: string, to: string) {
  const wanted = channels.map((c) => c.toLowerCase());

  const customerIds: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await getDb()
      .from("customers")
      .select("id, source")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Failed to read customers: ${error.message}`);
    if (!data?.length) break;
    for (const c of data as unknown as Array<{ id: string; source: string | null }>) {
      // Case-insensitive and trimmed: the column holds "google" and "Google",
      // "instagram" and "Instagram".
      const s = (c.source ?? "").trim().toLowerCase();
      if (s && wanted.includes(s)) customerIds.push(c.id);
    }
    if (data.length < PAGE) break;
  }

  if (!customerIds.length) return { revenue: 0, customerCount: 0, orderCount: 0 };

  let revenue = 0;
  let orderCount = 0;
  const CHUNK = 200;
  for (let i = 0; i < customerIds.length; i += CHUNK) {
    const chunk = customerIds.slice(i, i + CHUNK);
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await getDb()
        .from("orders")
        .select("id, total")
        .in("customer_id", chunk)
        .gte("order_date", from)
        .lte("order_date", to)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error(`Failed to read orders: ${error.message}`);
      if (!data?.length) break;
      for (const o of data as unknown as Array<{ total: unknown }>) revenue += num(o.total);
      orderCount += data.length;
      if (data.length < PAGE) break;
    }
  }

  return { revenue, customerCount: customerIds.length, orderCount };
}

export interface SalarySlip {
  artistName: string;
  statedAs: string;
  fixed: number;
  /** Null when the rule is not settled, so nothing implies a payable figure. */
  commission: number | null;
  total: number | null;
  /** What the commission was worked out from, for showing the arithmetic. */
  basis: { label: string; amount: number; percent: number } | null;
  /** Set when the rule needs a decision before anyone is paid. */
  unresolved?: { question: string; options: Array<{ label: string; amount: number; total: number }> };
  /** Anything the reader should know about the data behind the number. */
  notes: string[];
}

export async function getSalarySlips(from: string, to: string): Promise<SalarySlip[]> {
  const { data: artistRows } = await getDb().from("artists").select("id, name");
  const artists = (artistRows ?? []) as unknown as Array<{ id: string; name: string }>;

  const slips: SalarySlip[] = [];

  for (const plan of SALARY_RULES) {
    const artist = artists.find((a) => a.name === plan.artistName);
    const notes: string[] = [];

    if (!artist) {
      slips.push({
        artistName: plan.artistName,
        statedAs: plan.statedAs,
        fixed: plan.fixed,
        commission: null,
        total: null,
        basis: null,
        notes: [`No artist named "${plan.artistName}" exists, so nothing can be calculated.`],
      });
      continue;
    }

    if (plan.rule.kind === "own_orders") {
      const rows = await ordersForArtist(artist.id, from, to);
      const billed = rows.reduce((s, r) => s + num(r.total), 0);
      const collected = rows.reduce((s, r) => s + num(r.total) - num(r.deposit), 0);
      const pct = plan.rule.percent / 100;

      if (plan.rule.basis === "UNRESOLVED") {
        slips.push({
          artistName: plan.artistName,
          statedAs: plan.statedAs,
          fixed: plan.fixed,
          commission: null,
          total: null,
          basis: null,
          unresolved: {
            question:
              '"Closed revenue" has no single meaning in this data: orders carry no status, so both readings are shown until it is confirmed.',
            options: [
              { label: "Total billed on his orders", amount: billed, total: plan.fixed + billed * pct },
              { label: "Balance collected (billed minus deposits)", amount: collected, total: plan.fixed + collected * pct },
            ],
          },
          notes: [`${rows.length} orders in this period.`],
        });
        continue;
      }

      const amount = plan.rule.basis === "billed" ? billed : collected;
      notes.push(
        "Appointments that are booked or scheduled are excluded: an order is only written once the work is completed."
      );
      slips.push({
        artistName: plan.artistName,
        statedAs: plan.statedAs,
        fixed: plan.fixed,
        commission: amount * pct,
        total: plan.fixed + amount * pct,
        basis: {
          label: plan.rule.basis === "billed" ? "Total billed on his orders" : "Balance collected",
          amount,
          percent: plan.rule.percent,
        },
        notes: [`${rows.length} completed orders in this period.`, ...notes],
      });
      continue;
    }

    if (plan.rule.kind === "channel_revenue") {
      const { revenue, customerCount, orderCount } = await revenueFromChannels(
        plan.rule.channels,
        from,
        to
      );
      const pct = plan.rule.percent / 100;
      notes.push(`${orderCount} orders from ${customerCount} customers on these channels.`);
      notes.push(
        "No customer record uses facebook, so that channel contributes nothing until it appears in the data."
      );
      slips.push({
        artistName: plan.artistName,
        statedAs: plan.statedAs,
        fixed: plan.fixed,
        commission: revenue * pct,
        total: plan.fixed + revenue * pct,
        basis: {
          label: `Revenue from ${plan.rule.channels.join(", ")} customers`,
          amount: revenue,
          percent: plan.rule.percent,
        },
        notes,
      });
      continue;
    }

    // studio_net_profit
    const summary = await getFinancialSummary(from, to);
    const profit = num((summary as { profit?: unknown }).profit);
    const summaryRevenue = num((summary as { revenue?: unknown }).revenue);
    const pct = plan.rule.percent / 100;
    if (profit < 0) {
      notes.push("The studio made a loss this period, so the commission is nil rather than negative.");
    }
    const commission = profit > 0 ? profit * pct : 0;

    // Net profit here is revenue minus what is recorded in the expenses table
    // for the month, which is the same figure the Finance screen shows. Say so
    // on the slip: if payroll, rent or materials are not entered as expenses,
    // this profit is overstated and so is the commission taken from it. July
    // 2026 for instance shows 602,796 of revenue against 5,523 of expenses.
    notes.push(
      "Net profit is revenue minus the expenses recorded for the month. Anything not entered as an expense, such as payroll or rent, is not deducted."
    );
    if (summaryRevenue > 0 && profit > summaryRevenue * 0.9) {
      notes.push(
        "Recorded expenses are under a tenth of revenue this month, so this profit figure is probably missing costs. Worth checking before paying against it."
      );
    }
    slips.push({
      artistName: plan.artistName,
      statedAs: plan.statedAs,
      fixed: plan.fixed,
      commission,
      total: plan.fixed + commission,
      basis: { label: "Studio net profit (revenue minus expenses)", amount: profit, percent: plan.rule.percent },
      notes,
    });
  }

  return slips;
}
