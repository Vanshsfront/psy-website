import { getDb, getFinancialSummary, getManualEntries } from "@/lib/storeadmin/server/database";

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
  | { kind: "studio_net_profit"; percent: number }
  /**
   * External freelancer paid a revenue share per job, with no base pay. The
   * share depends on who brought the work: the artist keeps `artistSourced`
   * percent of jobs they introduced and `studioSourced` percent of jobs the
   * studio introduced.
   */
  | { kind: "guest_revenue_share"; studioSourced: number; artistSourced: number };

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
    // Facebook dropped at Yogesh's request once it turned out no record uses it:
    // "my bad, we can exclude facebook altogether - it's only instagram and
    // google". Matched case-insensitively, because the column holds both
    // "google" and "Google", both "instagram" and "Instagram".
    rule: { kind: "channel_revenue", percent: 10, channels: ["google", "instagram"] },
    statedAs: "30k fixed + 10% of google and instagram leads",
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

/** Plain rupee formatting for the explanatory notes on a slip. */
const formatMoney = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;

/**
 * The guest artist deal, applied to every artist flagged is_guest_artist.
 *
 * Yogesh: "a 70:30 logic for customers sourced by the studio and a 30:70
 * revenue share logic for the customers sourced by the guest artists". Read as
 * studio-first in both pairs, so the artist keeps 30% of work the studio brought
 * and 70% of work they brought themselves. Confirm before anyone is paid on it:
 * reading the pairs the other way round inverts every figure.
 */
export const GUEST_ARTIST_RULE = {
  kind: "guest_revenue_share" as const,
  studioSourced: 30,
  artistSourced: 70,
};

/** Every order in the window for one artist. Paged, so totals cannot be capped. */
async function ordersForArtist(artistId: string, from: string, to: string) {
  const rows: Array<{ total: unknown; deposit: unknown; sourced_by?: unknown }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await getDb()
      .from("orders")
      .select("id, total, deposit, sourced_by")
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
  /**
   * Hand-entered lines for this person this month, added on top of the computed
   * figure. Yogesh: "its not set in stone, i do add bonuses as well time and
   * again". Signed, so a deduction is negative.
   */
  adjustments: Array<{ id: string; label: string; amount: number; kind: string }>;
  adjustmentTotal: number;
}

export async function getSalarySlips(from: string, to: string): Promise<SalarySlip[]> {
  const { data: artistRows } = await getDb().from("artists").select("id, name");
  const artists = (artistRows ?? []) as unknown as Array<{ id: string; name: string }>;

  const manual = await getManualEntries({ scope: "salary", from, to });

  // Guest artists are not listed in SALARY_RULES. They come and go, so their
  // plans are generated from the is_guest_artist flag on the artist record: flag
  // somebody and they get a slip, with no code change.
  const { data: guestRows } = await getDb()
    .from("artists")
    .select("name")
    .eq("is_guest_artist", true);
  const guestPlans: SalaryPlan[] = ((guestRows ?? []) as unknown as Array<{ name: string }>).map(
    (g) => ({
      artistName: g.name,
      fixed: 0, // "Have no base pay"
      rule: GUEST_ARTIST_RULE,
      statedAs: `No base pay, ${GUEST_ARTIST_RULE.studioSourced}% of studio-sourced work and ${GUEST_ARTIST_RULE.artistSourced}% of their own`,
    })
  );

  const slips: Array<Omit<SalarySlip, "adjustments" | "adjustmentTotal">> = [];

  for (const plan of [...SALARY_RULES, ...guestPlans]) {
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
        "Only counts customers with a recorded source. Historic customers predate that field, so older months understate this."
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

    if (plan.rule.kind === "guest_revenue_share") {
      const rows = await ordersForArtist(artist.id, from, to);

      let studioSourced = 0;
      let artistSourced = 0;
      let unrecorded = 0;
      for (const r of rows) {
        const value = num(r.total);
        if (r.sourced_by === "studio") studioSourced += value;
        else if (r.sourced_by === "artist") artistSourced += value;
        else unrecorded += value;
      }

      const share =
        (studioSourced * plan.rule.studioSourced) / 100 +
        (artistSourced * plan.rule.artistSourced) / 100;

      notes.push(
        `Studio brought ${formatMoney(studioSourced)} at ${plan.rule.studioSourced}%, they brought ${formatMoney(artistSourced)} at ${plan.rule.artistSourced}%.`
      );
      if (unrecorded > 0) {
        // Not folded in at either rate. Picking one would invent a split.
        notes.push(
          `${formatMoney(unrecorded)} of work has no record of who brought it, so it is excluded rather than assumed. Set that on the order to include it.`
        );
      }

      slips.push({
        artistName: plan.artistName,
        statedAs: plan.statedAs,
        fixed: plan.fixed,
        commission: share,
        total: plan.fixed + share,
        basis: {
          label: "Revenue share on their own jobs",
          amount: studioSourced + artistSourced,
          percent: plan.rule.artistSourced,
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
      "Net profit is revenue minus the expenses recorded for the month, salaries included, as Yogesh confirmed: payroll is an expense and this is worked out after it."
    );
    notes.push(
      "Enter his BASE pay as the expense, not his total. Entering the total puts this commission inside the figure it is calculated from, which makes the number depend on itself."
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

  // Fold the hand-entered lines in last, so the computed figure and what was
  // added to it stay separately visible on the slip.
  return slips.map((slip) => {
    const artist = artists.find((a) => a.name === slip.artistName);
    const mine = artist ? manual.filter((m) => m.artist_id === artist.id) : [];
    const adjustmentTotal = mine.reduce((sum, m) => sum + Number(m.amount || 0), 0);
    return {
      ...slip,
      adjustments: mine.map((m) => ({
        id: m.id,
        label: m.label,
        amount: Number(m.amount || 0),
        kind: m.kind,
      })),
      adjustmentTotal,
      // A slip with no settled rule stays unpayable even with a bonus on it.
      total: slip.total === null ? null : slip.total + adjustmentTotal,
    };
  });
}
