"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Customer } from "@/types/storeadmin";

/**
 * Filter a customer list on every attribute the CRM knows about.
 *
 * The campaign builder previously offered only a name/phone/Instagram search, so
 * targeting "everyone who spent over ₹10k with Sohel since June" meant either
 * trusting the AI filter or ticking names by hand. These are the same dimensions
 * the Customers table shows, applied client-side against the already-loaded list.
 */

export interface CustomerFilters {
  search: string;
  sources: Set<string>;
  artists: Set<string>;
  paymentModes: Set<string>;
  minSpend: string;
  maxSpend: string;
  minVisits: string;
  maxVisits: string;
  visitedFrom: string;
  visitedTo: string;
  /** Reachability — a campaign can only go to someone with a number. */
  requirePhone: boolean;
  requireEmail: boolean;
  requireInstagram: boolean;
  /** Customers who have never ordered. */
  neverVisited: boolean;
}

export function emptyFilters(): CustomerFilters {
  return {
    search: "",
    sources: new Set(),
    artists: new Set(),
    paymentModes: new Set(),
    minSpend: "",
    maxSpend: "",
    minVisits: "",
    maxVisits: "",
    visitedFrom: "",
    visitedTo: "",
    requirePhone: false,
    requireEmail: false,
    requireInstagram: false,
    neverVisited: false,
  };
}

/** Case and spacing in `source` are inconsistent, so compare canonically. */
const canon = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

export function applyCustomerFilters(customers: Customer[], f: CustomerFilters): Customer[] {
  const q = f.search.trim().toLowerCase();

  return customers.filter((c) => {
    if (q) {
      const hay = [c.name, c.phone, c.instagram, c.email, c.notes]
        .map((v) => (v ?? "").toLowerCase())
        .join(" ");
      if (!hay.includes(q)) return false;
    }

    if (f.sources.size && !f.sources.has(canon(c.source))) return false;
    if (f.artists.size && !f.artists.has(canon(c.last_artist_name))) return false;

    if (f.paymentModes.size) {
      const used = (c.payment_modes_used ?? []).map(canon);
      if (!used.some((m) => f.paymentModes.has(m))) return false;
    }

    const spend = c.lifetime_spend ?? 0;
    if (f.minSpend && spend < Number(f.minSpend)) return false;
    if (f.maxSpend && spend > Number(f.maxSpend)) return false;

    const visits = c.visit_count ?? 0;
    if (f.neverVisited && visits > 0) return false;
    if (f.minVisits && visits < Number(f.minVisits)) return false;
    if (f.maxVisits && visits > Number(f.maxVisits)) return false;

    const last = (c.last_visit_date ?? "").slice(0, 10);
    // A customer with no visits has no date to compare, so a date filter
    // excludes them rather than silently letting them through.
    if (f.visitedFrom && (!last || last < f.visitedFrom)) return false;
    if (f.visitedTo && (!last || last > f.visitedTo)) return false;

    if (f.requirePhone && !(c.phone ?? "").trim()) return false;
    if (f.requireEmail && !(c.email ?? "").trim()) return false;
    if (f.requireInstagram && !(c.instagram ?? "").trim()) return false;

    return true;
  });
}

export function activeFilterCount(f: CustomerFilters): number {
  let n = 0;
  if (f.search.trim()) n++;
  n += f.sources.size ? 1 : 0;
  n += f.artists.size ? 1 : 0;
  n += f.paymentModes.size ? 1 : 0;
  if (f.minSpend || f.maxSpend) n++;
  if (f.minVisits || f.maxVisits) n++;
  if (f.visitedFrom || f.visitedTo) n++;
  if (f.requirePhone) n++;
  if (f.requireEmail) n++;
  if (f.requireInstagram) n++;
  if (f.neverVisited) n++;
  return n;
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) {
    return <span className="text-xs text-[var(--muted)]">None recorded</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
            selected.has(o)
              ? "bg-[var(--primary)] text-ink"
              : "neo-btn text-[var(--muted)]"
          }`}
        >
          {o || "—"}
        </button>
      ))}
    </div>
  );
}

export default function CustomerFilterPanel({
  customers,
  filters,
  onChange,
  matchCount,
}: {
  customers: Customer[];
  filters: CustomerFilters;
  onChange: (next: CustomerFilters) => void;
  matchCount: number;
}) {
  const [open, setOpen] = useState(false);

  // Options come from the data itself, so a new source or artist appears here
  // without anyone maintaining a list.
  const options = useMemo(() => {
    const sources = new Set<string>();
    const artists = new Set<string>();
    const modes = new Set<string>();
    for (const c of customers) {
      if (canon(c.source)) sources.add(canon(c.source));
      if (canon(c.last_artist_name)) artists.add(canon(c.last_artist_name));
      for (const m of c.payment_modes_used ?? []) if (canon(m)) modes.add(canon(m));
    }
    const sort = (s: Set<string>) => Array.from(s).sort();
    return { sources: sort(sources), artists: sort(artists), modes: sort(modes) };
  }, [customers]);

  const set = <K extends keyof CustomerFilters>(key: K, val: CustomerFilters[K]) =>
    onChange({ ...filters, [key]: val });

  const toggleIn = (key: "sources" | "artists" | "paymentModes", value: string) => {
    const next = new Set(filters[key]);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange({ ...filters, [key]: next });
  };

  const active = activeFilterCount(filters);
  const label = "text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1.5 block";

  return (
    <div className="border border-[var(--border-color)] rounded mb-4">
      <div className="flex items-center gap-3 p-3 flex-wrap">
        <input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search name, phone, Instagram, email, notes…"
          className="flex-1 min-w-[220px] px-3 py-2 neo-input text-sm"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 neo-btn rounded text-sm"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {active > 0 && (
            <span className="px-1.5 rounded bg-[var(--primary)] text-ink text-[10px]">{active}</span>
          )}
        </button>
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange(emptyFilters())}
            className="flex items-center gap-1 text-xs text-[var(--muted)]"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <span className="text-sm text-[var(--muted)] ml-auto">
          {matchCount} match{matchCount === 1 ? "" : "es"}
        </span>
      </div>

      {open && (
        <div className="border-t border-[var(--border-color)] p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <span className={label}>Source</span>
            <Chips options={options.sources} selected={filters.sources} onToggle={(v) => toggleIn("sources", v)} />
          </div>

          <div>
            <span className={label}>Last artist</span>
            <Chips options={options.artists} selected={filters.artists} onToggle={(v) => toggleIn("artists", v)} />
          </div>

          <div>
            <span className={label}>Has paid by</span>
            <Chips options={options.modes} selected={filters.paymentModes} onToggle={(v) => toggleIn("paymentModes", v)} />
          </div>

          <div>
            <span className={label}>Lifetime spend (₹)</span>
            <div className="flex items-center gap-2">
              <input type="number" value={filters.minSpend} onChange={(e) => set("minSpend", e.target.value)}
                placeholder="min" className="w-full px-3 py-2 neo-input text-sm" />
              <span className="text-[var(--muted)]">–</span>
              <input type="number" value={filters.maxSpend} onChange={(e) => set("maxSpend", e.target.value)}
                placeholder="max" className="w-full px-3 py-2 neo-input text-sm" />
            </div>
          </div>

          <div>
            <span className={label}>Visits</span>
            <div className="flex items-center gap-2">
              <input type="number" value={filters.minVisits} onChange={(e) => set("minVisits", e.target.value)}
                placeholder="min" className="w-full px-3 py-2 neo-input text-sm" />
              <span className="text-[var(--muted)]">–</span>
              <input type="number" value={filters.maxVisits} onChange={(e) => set("maxVisits", e.target.value)}
                placeholder="max" className="w-full px-3 py-2 neo-input text-sm" />
            </div>
          </div>

          <div>
            <span className={label}>Last visited between</span>
            <div className="flex items-center gap-2">
              <input type="date" value={filters.visitedFrom} onChange={(e) => set("visitedFrom", e.target.value)}
                className="w-full px-3 py-2 neo-input text-sm [color-scheme:dark]" />
              <span className="text-[var(--muted)]">–</span>
              <input type="date" value={filters.visitedTo} onChange={(e) => set("visitedTo", e.target.value)}
                className="w-full px-3 py-2 neo-input text-sm [color-scheme:dark]" />
            </div>
          </div>

          <div className="md:col-span-2">
            <span className={label}>Only include customers who…</span>
            <div className="flex flex-wrap gap-4 text-sm">
              {([
                ["requirePhone", "have a phone number"],
                ["requireEmail", "have an email"],
                ["requireInstagram", "have an Instagram"],
                ["neverVisited", "have never visited"],
              ] as const).map(([key, text]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="w-4 h-4 accent-[var(--primary)]"
                  />
                  <span className="text-[var(--muted)]">{text}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-2">
              WhatsApp needs a phone number, so anyone without one is skipped at send
              time whether or not you filter on it here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
