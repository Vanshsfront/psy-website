/**
 * Day-string date handling for the store admin.
 *
 * Everything here works on `YYYY-MM-DD` strings rather than Date objects.
 * `order_date` / `expense_date` are calendar days, and running them through
 * `new Date()` re-interprets them as UTC instants — east of Greenwich that
 * silently shifts a day (`new Date(2026, 6, 1).toISOString()` is 2026-06-30 in
 * IST), which is how month and year totals ended up off by a day's revenue.
 * Comparing zero-padded day strings lexicographically sidesteps time zones.
 */

export type DatePreset = "this_week" | "this_month" | "this_year" | "all_time" | "custom";

export interface DayRange {
    from: string;
    to: string;
}

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

/** Local calendar day of a Date, as `YYYY-MM-DD`. */
export function formatDayLocal(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Normalise a stored date to its calendar day. Accepts a bare `YYYY-MM-DD`
 * or a full timestamp, so the column may be `date` or `timestamptz`.
 */
export function toDay(value: string | null | undefined): string {
    if (!value) return "";
    return String(value).slice(0, 10);
}

/** Today, in the viewer's time zone. */
export function todayLocal(now: Date = new Date()): string {
    return formatDayLocal(now);
}

/** Shift a day string by `n` days. Pure calendar arithmetic, no time zone. */
export function addDays(day: string, n: number): string {
    const [y, m, d] = day.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/**
 * The full calendar period containing `now` — not period-to-date. "Month"
 * means every day of this month, so the dashboard total matches an Orders tab
 * filtered to the same month even when an order is dated later in it.
 */
export function presetRange(preset: DatePreset, now: Date = new Date()): DayRange {
    switch (preset) {
        case "this_week": {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
            return { from: formatDayLocal(start), to: formatDayLocal(end) };
        }
        case "this_month": {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            // Day 0 of next month is the last day of this one.
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { from: formatDayLocal(start), to: formatDayLocal(end) };
        }
        case "this_year": {
            return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
        }
        case "all_time":
        case "custom":
        default:
            return { from: "", to: "" };
    }
}

/**
 * Is `value` within `[from, to]`, both ends inclusive? Empty bounds are
 * unbounded. A row with no date only survives an unbounded range.
 */
export function inDayRange(value: string | null | undefined, from: string, to: string): boolean {
    if (!from && !to) return true;
    const day = toDay(value);
    if (!day) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
}

/**
 * Exclusive upper bound for a PostgREST filter: `.lt(column, endExclusive(to))`.
 * `.lte(column, to)` would drop same-day rows if the column is a timestamp,
 * because `'2026-07-10'` widens to midnight.
 */
export function endExclusive(to: string): string {
    return addDays(to, 1);
}

/** Human label for the active range, e.g. "1 Jul 2026 – 31 Jul 2026". */
export function describeRange(from: string, to: string): string {
    if (!from && !to) return "All time";
    const fmt = (day: string) => {
        const [y, m, d] = day.split("-").map(Number);
        const month = new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-IN", {
            month: "short",
            timeZone: "UTC",
        });
        return `${d} ${month} ${y}`;
    };
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return `From ${fmt(from)}`;
    return `Until ${fmt(to)}`;
}
