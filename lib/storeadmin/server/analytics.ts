import { getDb } from "@/lib/storeadmin/server/database";

/**
 * The analytics Yogesh asked for, 2026-08-19:
 *
 *   "Ticket size based filtered by artists - Month on Month stats
 *    Number of orders week on week / month on month / quarter on quarter, split
 *    by artist, source, - growth degrowth numbers
 *    Type of service by artist over a specific period - piercings, tattoos,
 *    jewellery
 *    Number of deposits collected / appointments booked by artist (WoW, MoM, QoQ)
 *    Type of appointments by source"
 *
 * Everything is computed from two reads, orders and appointments, and bucketed
 * in memory. Doing it as one pass rather than a query per bucket keeps this to
 * two round trips instead of dozens, and the studio's volume (about 2,500
 * orders all time) is nowhere near large enough to need SQL aggregation.
 *
 * Both reads page past the 1000-row response cap. A bare select would silently
 * return the first page and every chart drawn from it would be wrong in a way
 * nobody could see.
 */

const PAGE = 1000;
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/**
 * Fold a channel label to a grouping key.
 *
 * The column is free text typed by hand, so the same channel arrives spelled
 * several ways. Lowercasing alone is not enough: the data holds both "walk-in"
 * (153 rows) and "walk - in" (16), which would otherwise be reported as two
 * different channels and both understated. Spacing around hyphens and slashes
 * is removed and runs of whitespace collapsed.
 *
 * It does not try to merge genuinely different words. "referral" and
 * "reference" stay apart, because deciding those are the same thing is a
 * judgement about the business, not about formatting.
 */
export function channelKey(raw: string | null): string {
  const s = (raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s*([-/])\s*/g, "$1")
    .replace(/\s+/g, " ");
  return s || "not recorded";
}

export type Grain = "week" | "month" | "quarter";

interface OrderRow {
  id: string;
  order_date: string;
  total: unknown;
  deposit: unknown;
  artist_id: string | null;
  source: string | null;
  service_description: string | null;
}

interface AppointmentRow {
  id: string;
  starts_at: string;
  artist_id: string | null;
  source: string | null;
  status: string | null;
}

async function readAll<T>(table: string, columns: string, dateCol: string, from: string, to: string) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = getDb().from(table).select(columns);
    if (from) q = q.gte(dateCol, from);
    if (to) q = q.lte(dateCol, to);
    const { data, error } = await q.order("id", { ascending: true }).range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Failed to read ${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as unknown as T[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

/** ISO week, so weeks are comparable across a year boundary. */
function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday of the current week decides the year, per ISO 8601.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function bucketKey(dateStr: string, grain: Grain): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "unknown";
  if (grain === "week") return weekKey(d);
  if (grain === "quarter") return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Classify a job from its free-text description.
 *
 * There is no service-type column, so this reads the words people actually
 * type. It is a best guess and says so: anything unmatched lands in "other"
 * rather than being forced into a category it does not belong in.
 */
function serviceType(description: string | null): "tattoo" | "piercing" | "jewellery" | "other" {
  const d = (description ?? "").toLowerCase();
  if (/pierc|nostril|septum|helix|lobe|tragus|navel/.test(d)) return "piercing";
  if (/jewel|jewell|ring|chain|pendant|stud|earring/.test(d)) return "jewellery";
  if (/tattoo|tatoo|ink|sleeve|cover ?up|touch ?up|script|portrait/.test(d)) return "tattoo";
  return "other";
}

export interface Point {
  bucket: string;
  orders: number;
  revenue: number;
  deposits: number;
  /** Percent change against the previous bucket. Null for the first one. */
  growth: number | null;
}

export interface AnalyticsResult {
  grain: Grain;
  period: { from: string; to: string };
  artists: Array<{ id: string; name: string }>;
  /** Orders, revenue and deposits per period, with growth against the previous. */
  timeline: Point[];
  /** Average order value per period, the "ticket size" line. */
  ticketSize: Array<{ bucket: string; average: number; orders: number }>;
  /** One timeline per artist. */
  byArtist: Array<{ artistId: string | null; name: string; points: Point[]; total: number; orders: number }>;
  /** One timeline per acquisition channel. */
  bySource: Array<{ source: string; points: Point[]; total: number; orders: number }>;
  /** Service mix per artist over the whole window. */
  serviceMix: Array<{ name: string; tattoo: number; piercing: number; jewellery: number; other: number }>;
  /** Appointments booked per period per artist. */
  appointmentsByArtist: Array<{ name: string; points: Array<{ bucket: string; count: number }>; total: number }>;
  /** Appointments by the channel the customer came from. */
  appointmentsBySource: Array<{ source: string; count: number }>;
  notes: string[];
}

/** Percent change, guarding the divide-by-zero that would otherwise read Infinity. */
function growthOf(current: number, previous: number | undefined): number | null {
  if (previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function toPoints(
  buckets: string[],
  data: Map<string, { orders: number; revenue: number; deposits: number }>
): Point[] {
  return buckets.map((b, i) => {
    const cur = data.get(b) ?? { orders: 0, revenue: 0, deposits: 0 };
    const prev = i > 0 ? data.get(buckets[i - 1]) : undefined;
    return { bucket: b, ...cur, growth: growthOf(cur.revenue, prev?.revenue) };
  });
}

export async function getAnalytics(
  from: string,
  to: string,
  grain: Grain = "month",
  artistFilter: string | null = null
): Promise<AnalyticsResult> {
  const [orders, appointments, artistRows] = await Promise.all([
    readAll<OrderRow>(
      "orders",
      "id, order_date, total, deposit, artist_id, source, service_description",
      "order_date",
      from,
      to
    ),
    readAll<AppointmentRow>("appointments", "id, starts_at, artist_id, source, status", "starts_at", from, to),
    getDb().from("artists").select("id, name, display_name").then((r) => r.data ?? []),
  ]);

  const artists = (artistRows as unknown as Array<{ id: string; name: string; display_name?: string }>).map(
    (a) => ({ id: a.id, name: a.display_name || a.name })
  );
  const nameFor = (id: string | null) =>
    id ? artists.find((a) => a.id === id)?.name ?? "Unknown artist" : "No artist recorded";

  const scoped = artistFilter ? orders.filter((o) => o.artist_id === artistFilter) : orders;

  // Buckets present in the data, in order, so a quiet week is not invented.
  const buckets = Array.from(new Set(scoped.map((o) => bucketKey(o.order_date, grain)))).sort();

  const overall = new Map<string, { orders: number; revenue: number; deposits: number }>();
  const perArtist = new Map<string | null, Map<string, { orders: number; revenue: number; deposits: number }>>();
  const perSource = new Map<string, Map<string, { orders: number; revenue: number; deposits: number }>>();
  const mix = new Map<string, { tattoo: number; piercing: number; jewellery: number; other: number }>();

  const bump = (
    m: Map<string, { orders: number; revenue: number; deposits: number }>,
    key: string,
    o: OrderRow
  ) => {
    const cur = m.get(key) ?? { orders: 0, revenue: 0, deposits: 0 };
    cur.orders += 1;
    cur.revenue += num(o.total);
    cur.deposits += num(o.deposit);
    m.set(key, cur);
  };

  for (const o of scoped) {
    const b = bucketKey(o.order_date, grain);
    bump(overall, b, o);

    if (!perArtist.has(o.artist_id)) perArtist.set(o.artist_id, new Map());
    bump(perArtist.get(o.artist_id)!, b, o);

    const src = channelKey(o.source);
    if (!perSource.has(src)) perSource.set(src, new Map());
    bump(perSource.get(src)!, b, o);

    const artistName = nameFor(o.artist_id);
    const row = mix.get(artistName) ?? { tattoo: 0, piercing: 0, jewellery: 0, other: 0 };
    row[serviceType(o.service_description)] += 1;
    mix.set(artistName, row);
  }

  const timeline = toPoints(buckets, overall);

  const ticketSize = buckets.map((b) => {
    const cur = overall.get(b) ?? { orders: 0, revenue: 0, deposits: 0 };
    return { bucket: b, average: cur.orders ? cur.revenue / cur.orders : 0, orders: cur.orders };
  });

  const byArtist = Array.from(perArtist.entries())
    .map(([id, m]) => {
      const points = toPoints(buckets, m);
      return {
        artistId: id,
        name: nameFor(id),
        points,
        total: points.reduce((s, p) => s + p.revenue, 0),
        orders: points.reduce((s, p) => s + p.orders, 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  const bySource = Array.from(perSource.entries())
    .map(([source, m]) => {
      const points = toPoints(buckets, m);
      return {
        source,
        points,
        total: points.reduce((s, p) => s + p.revenue, 0),
        orders: points.reduce((s, p) => s + p.orders, 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  const serviceMix = Array.from(mix.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.tattoo + b.piercing + b.jewellery + b.other - (a.tattoo + a.piercing + a.jewellery + a.other));

  // Appointments, on the same buckets so the two can be read side by side.
  const scopedAppts = artistFilter ? appointments.filter((a) => a.artist_id === artistFilter) : appointments;
  const apptBuckets = Array.from(new Set(scopedAppts.map((a) => bucketKey(a.starts_at, grain)))).sort();

  const perArtistAppt = new Map<string, Map<string, number>>();
  const apptSource = new Map<string, number>();
  for (const a of scopedAppts) {
    const b = bucketKey(a.starts_at, grain);
    const name = nameFor(a.artist_id);
    if (!perArtistAppt.has(name)) perArtistAppt.set(name, new Map());
    const m = perArtistAppt.get(name)!;
    m.set(b, (m.get(b) ?? 0) + 1);

    const src = channelKey(a.source);
    apptSource.set(src, (apptSource.get(src) ?? 0) + 1);
  }

  const appointmentsByArtist = Array.from(perArtistAppt.entries())
    .map(([name, m]) => ({
      name,
      points: apptBuckets.map((b) => ({ bucket: b, count: m.get(b) ?? 0 })),
      total: Array.from(m.values()).reduce((s, n) => s + n, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const appointmentsBySource = Array.from(apptSource.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const notes: string[] = [];
  const unsourced = scoped.filter((o) => !o.source || !o.source.trim()).length;
  if (unsourced) {
    notes.push(
      `${unsourced} of ${scoped.length} orders have no channel recorded, so the source split understates every channel.`
    );
  }
  const otherService = serviceMix.reduce((s, r) => s + r.other, 0);
  if (otherService) {
    notes.push(
      `${otherService} jobs could not be classified as tattoo, piercing or jewellery. There is no service-type field, so this is read from the description text.`
    );
  }
  if (appointments.length === 0) {
    notes.push("No appointments fall in this period. The appointments module is new, so earlier months have none.");
  }

  return {
    grain,
    period: { from, to },
    artists,
    timeline,
    ticketSize,
    byArtist,
    bySource,
    serviceMix,
    appointmentsByArtist,
    appointmentsBySource,
    notes,
  };
}
