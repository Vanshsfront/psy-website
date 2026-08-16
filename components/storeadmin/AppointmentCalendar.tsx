"use client";

import { useMemo, useRef, useEffect } from "react";
import type { Appointment } from "@/types/storeadmin";

/**
 * Day, week and month views of the appointment book.
 *
 * Day and week share one 24-hour time grid — the studio takes late sessions, so
 * clipping to opening hours would hide real bookings. Both scroll to the first
 * booking on mount rather than starting at midnight. Month drops the time axis
 * entirely and shows counts, because forty appointments on a timeline at that
 * zoom is unreadable.
 *
 * The three states are drawn as the reference asked: booked is an outline,
 * confirmed is filled, completed is dimmed.
 */

export type CalendarView = "day" | "week" | "month";

const HOUR_PX = 56;
const DEFAULT_MINUTES = 60; // what an appointment with no end time occupies

const STATE_STYLES: Record<string, string> = {
  booked: "bg-transparent border border-[var(--primary)] text-[var(--primary)]",
  confirmed: "bg-[var(--primary)] border border-[var(--primary)] text-ink",
  completed: "bg-[var(--surface-hover)] border border-[var(--border-color)] text-[var(--muted)] opacity-60",
  no_show: "bg-transparent border border-dashed border-[var(--danger)] text-[var(--danger)]",
  cancelled: "bg-transparent border border-dashed border-[var(--muted)] text-[var(--muted)] line-through",
};

const DOT_STYLES: Record<string, string> = {
  booked: "border border-[var(--primary)]",
  confirmed: "bg-[var(--primary)]",
  completed: "bg-[var(--muted)] opacity-60",
  no_show: "border border-dashed border-[var(--danger)]",
  cancelled: "bg-[var(--muted)] opacity-40",
};

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minutesFromMidnight = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Sunday-first week containing `d`. */
function weekDays(d: Date): Date[] {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const c = new Date(start);
    c.setDate(start.getDate() + i);
    return c;
  });
}

/** Whole weeks covering the month containing `d`, so the grid is never ragged. */
function monthGrid(d: Date): Date[] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const total = Math.ceil((last.getDate() + first.getDay()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const c = new Date(start);
    c.setDate(start.getDate() + i);
    return c;
  });
}

/** Lay a single day's appointments into non-overlapping columns. */
function layout(dayAppts: Appointment[]) {
  const sorted = [...dayAppts].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
  const columns: Appointment[][] = [];
  for (const appt of sorted) {
    const start = minutesFromMidnight(appt.starts_at);
    const col = columns.find((c) => {
      const last = c[c.length - 1];
      const lastEnd = last.ends_at
        ? minutesFromMidnight(last.ends_at)
        : minutesFromMidnight(last.starts_at) + DEFAULT_MINUTES;
      return lastEnd <= start;
    });
    if (col) col.push(appt);
    else columns.push([appt]);
  }
  return sorted.map((appt) => {
    const start = minutesFromMidnight(appt.starts_at);
    const end = appt.ends_at ? minutesFromMidnight(appt.ends_at) : start + DEFAULT_MINUTES;
    return {
      appt,
      top: (start / 60) * HOUR_PX,
      height: Math.max(((end - start) / 60) * HOUR_PX, 26),
      colIndex: columns.findIndex((c) => c.includes(appt)),
      colCount: columns.length || 1,
    };
  });
}

export default function AppointmentCalendar({
  appointments,
  view,
  anchor,
  onSelect,
  onPickDay,
}: {
  appointments: Appointment[];
  view: CalendarView;
  /** The day the view is centred on. */
  anchor: Date;
  onSelect: (a: Appointment) => void;
  /** Clicking a month cell jumps to that day. */
  onPickDay?: (d: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const k = dayKey(new Date(a.starts_at));
      map.set(k, [...(map.get(k) ?? []), a]);
    }
    return map;
  }, [appointments]);

  const days = view === "day" ? [anchor] : view === "week" ? weekDays(anchor) : [];

  useEffect(() => {
    if (view === "month" || !scrollRef.current) return;
    const earliest = days
      .flatMap((d) => byDay.get(dayKey(d)) ?? [])
      .reduce<number | null>((min, a) => {
        const m = minutesFromMidnight(a.starts_at);
        return min === null || m < min ? m : min;
      }, null);
    scrollRef.current.scrollTop =
      earliest !== null ? Math.max((earliest / 60) * HOUR_PX - HOUR_PX, 0) : 10 * HOUR_PX;
  }, [view, anchor, byDay, days]);

  if (view === "month") {
    const cells = monthGrid(anchor);
    const today = dayKey(new Date());
    return (
      <div className="border border-[var(--border-color)] rounded overflow-hidden">
        <div className="grid grid-cols-7">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-[10px] uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border-color)]">
              {d}
            </div>
          ))}
          {cells.map((d) => {
            const k = dayKey(d);
            const list = byDay.get(k) ?? [];
            const outside = d.getMonth() !== anchor.getMonth();
            return (
              <button
                key={k}
                onClick={() => onPickDay?.(d)}
                className={`min-h-[92px] text-left p-2 border-b border-r border-[var(--border-color)] align-top hover:bg-[var(--surface-hover)] transition-colors ${
                  outside ? "opacity-35" : ""
                }`}
              >
                <span
                  className={`text-xs tabular-nums ${
                    k === today ? "text-[var(--primary)] font-semibold" : "text-[var(--muted)]"
                  }`}
                >
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {list.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_STYLES[a.status] ?? DOT_STYLES.booked}`} />
                      <span className="text-[10px] truncate text-[var(--muted)]">
                        {timeLabel(a.starts_at)} {a.customers?.name ?? ""}
                      </span>
                    </div>
                  ))}
                  {list.length > 3 && (
                    <span className="text-[10px] text-[var(--muted)]">+{list.length - 3} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const gutter = 56;
  return (
    <div className="border border-[var(--border-color)] rounded overflow-hidden">
      {view === "week" && (
        <div className="flex border-b border-[var(--border-color)]" style={{ paddingLeft: gutter }}>
          {days.map((d) => {
            const isToday = dayKey(d) === dayKey(new Date());
            return (
              <button
                key={dayKey(d)}
                onClick={() => onPickDay?.(d)}
                className="flex-1 py-2 text-center hover:bg-[var(--surface-hover)]"
              >
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className={`text-sm tabular-nums ${isToday ? "text-[var(--primary)] font-semibold" : ""}`}>
                  {d.getDate()}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div ref={scrollRef} className="relative overflow-y-auto" style={{ maxHeight: "68vh" }}>
        <div className="relative" style={{ height: 24 * HOUR_PX }}>
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-[var(--border-color)]"
              style={{ top: h * HOUR_PX, height: HOUR_PX }}
            >
              <span className="absolute -top-2 left-2 text-[10px] text-[var(--muted)] tabular-nums">
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </span>
            </div>
          ))}

          {days.map((d, dayIdx) => {
            const dayWidthPct = 100 / days.length;
            return layout(byDay.get(dayKey(d)) ?? []).map(({ appt, top, height, colIndex, colCount }) => {
              const innerPct = dayWidthPct / colCount;
              return (
                <button
                  key={appt.id}
                  onClick={() => onSelect(appt)}
                  className={`absolute rounded px-1.5 py-1 text-left overflow-hidden transition-colors ${
                    STATE_STYLES[appt.status] ?? STATE_STYLES.booked
                  }`}
                  style={{
                    top,
                    height,
                    left: `calc(${gutter}px + (100% - ${gutter}px) * ${
                      (dayIdx * dayWidthPct + colIndex * innerPct) / 100
                    })`,
                    width: `calc((100% - ${gutter}px) * ${(innerPct * 0.94) / 100})`,
                  }}
                  title={`${appt.customers?.name ?? "Customer"} · ${appt.status}`}
                >
                  <span className="block text-[11px] font-medium truncate">
                    {appt.customers?.name ?? "Customer"}
                  </span>
                  {height > 32 && (
                    <span className="block text-[10px] truncate opacity-80">
                      {timeLabel(appt.starts_at)}
                      {appt.artists?.name ? ` · ${appt.artists.name}` : ""}
                    </span>
                  )}
                  {height > 56 && appt.service_description && (
                    <span className="block text-[10px] truncate opacity-70">
                      {appt.service_description}
                    </span>
                  )}
                </button>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
