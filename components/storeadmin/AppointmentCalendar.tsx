"use client";

import { useMemo, useRef, useEffect } from "react";
import type { Appointment } from "@/types/storeadmin";

/**
 * Day view of appointments on a 24-hour grid.
 *
 * A full 24 hours rather than fixed studio hours, because the studio takes late
 * sessions and a clipped grid would hide them. The view scrolls to the first
 * booking on mount so the empty small hours are never what you land on.
 *
 * The three states are drawn as the reference asked: booked is an outline,
 * confirmed is filled, completed is dimmed.
 */

const HOUR_PX = 56;
const DEFAULT_MINUTES = 60; // what an appointment with no end time occupies

const STATE_STYLES: Record<string, string> = {
  booked: "bg-transparent border border-[var(--primary)] text-[var(--primary)]",
  confirmed: "bg-[var(--primary)] border border-[var(--primary)] text-ink",
  completed: "bg-[var(--surface-hover)] border border-[var(--border-color)] text-[var(--muted)] opacity-60",
  no_show: "bg-transparent border border-dashed border-[var(--danger)] text-[var(--danger)]",
  cancelled: "bg-transparent border border-dashed border-[var(--muted)] text-[var(--muted)] line-through",
};

function minutesFromMidnight(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function AppointmentCalendar({
  appointments,
  onSelect,
}: {
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const laidOut = useMemo(() => {
    const sorted = [...appointments].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    // Overlapping bookings share the width instead of covering each other —
    // two artists working at once is the normal case, not an edge case.
    const columns: Appointment[][] = [];
    for (const appt of sorted) {
      const start = minutesFromMidnight(appt.starts_at);
      const end = appt.ends_at ? minutesFromMidnight(appt.ends_at) : start + DEFAULT_MINUTES;
      const col = columns.find((c) => {
        const last = c[c.length - 1];
        const lastEnd = last.ends_at
          ? minutesFromMidnight(last.ends_at)
          : minutesFromMidnight(last.starts_at) + DEFAULT_MINUTES;
        return lastEnd <= start;
      });
      if (col) col.push(appt);
      else columns.push([appt]);
      void end;
    }

    return sorted.map((appt) => {
      const colIndex = columns.findIndex((c) => c.includes(appt));
      const start = minutesFromMidnight(appt.starts_at);
      const end = appt.ends_at ? minutesFromMidnight(appt.ends_at) : start + DEFAULT_MINUTES;
      return {
        appt,
        top: (start / 60) * HOUR_PX,
        height: Math.max(((end - start) / 60) * HOUR_PX, 26),
        colIndex,
        colCount: columns.length || 1,
      };
    });
  }, [appointments]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const first = laidOut[0];
    // Land on the day's first booking, or the working afternoon if it's empty.
    scrollRef.current.scrollTop = first ? Math.max(first.top - HOUR_PX, 0) : 10 * HOUR_PX;
  }, [laidOut]);

  return (
    <div
      ref={scrollRef}
      className="relative overflow-y-auto border border-[var(--border-color)] rounded"
      style={{ maxHeight: "70vh" }}
    >
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

        {laidOut.map(({ appt, top, height, colIndex, colCount }) => {
          const widthPct = 100 / colCount;
          return (
            <button
              key={appt.id}
              onClick={() => onSelect(appt)}
              className={`absolute rounded px-2 py-1 text-left overflow-hidden transition-colors ${
                STATE_STYLES[appt.status] ?? STATE_STYLES.booked
              }`}
              style={{
                top,
                height,
                left: `calc(56px + ${colIndex * widthPct}% * 0.92)`,
                width: `calc(${widthPct}% * 0.9)`,
              }}
              title={`${appt.customers?.name ?? "Customer"} · ${appt.status}`}
            >
              <span className="block text-[11px] font-medium truncate">
                {appt.customers?.name ?? "Customer"}
              </span>
              <span className="block text-[10px] truncate opacity-80">
                {timeLabel(appt.starts_at)}
                {appt.artists?.name ? ` · ${appt.artists.name}` : ""}
              </span>
              {height > 44 && appt.service_description && (
                <span className="block text-[10px] truncate opacity-70">
                  {appt.service_description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
