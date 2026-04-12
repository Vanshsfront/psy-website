"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Eye, Search, Calendar } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Contacted", value: "contacted" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-neon-green/20 text-neon-green border border-neon-green/50";
    case "completed":
      return "bg-mutedText text-black border border-mutedText";
    case "pending":
      return "bg-danger/20 text-danger border border-danger/50";
    case "contacted":
      return "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50";
    case "cancelled":
      return "bg-borderDark text-mutedText border border-borderDark";
    default:
      return "bg-borderDark text-white";
  }
}

export default function AdminBookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { bookings, isLoading } = useBookings();

  // Client-side filtering
  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.email?.toLowerCase().includes(q) ||
          b.style?.toLowerCase().includes(q)
      );
    }

    if (status) {
      result = result.filter((b) => b.status === status);
    }

    return result;
  }, [bookings, search, status]);

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === "pending").length,
    [bookings]
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">
            Booking Requests
          </h1>
          <p className="text-taupe text-caption mt-1">
            {bookings.length} request{bookings.length !== 1 ? "s" : ""}
            {pendingCount > 0 && (
              <span className="text-danger ml-2">
                · {pendingCount} pending review
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 bg-ink z-10 py-3 mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or style..."
            className="w-full border-0 border-b border-[#2a2a2a] bg-transparent pl-6 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 border border-[#2a2a2a] bg-ink px-3 text-sm text-bone focus:ring-1 focus:ring-psy-green outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="ml-auto text-taupe text-caption">
          Showing {filteredBookings.length} of {bookings.length}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="divide-y divide-borderDark">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-surfaceLighter/30" />
            ))}
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <Calendar className="w-10 h-10 mx-auto mb-4 text-taupe/40" />
          <p className="text-lg mb-2">No booking requests found</p>
          <p className="text-sm">
            {search || status
              ? "Try adjusting your filters"
              : "Booking requests will appear here when clients submit the form"}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surfaceLighter border-b border-borderDark text-xs uppercase tracking-wider text-mutedText font-mono">
                  <th className="p-4 font-medium">Date Rcvd</th>
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium">Inquiry</th>
                  <th className="p-4 font-medium">Style</th>
                  <th className="p-4 font-medium">Artist</th>
                  <th className="p-4 font-medium">Date Pref</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark text-sm">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-surfaceLighter/50 transition-colors"
                  >
                    <td className="p-4 font-mono text-mutedText text-xs">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-primaryText">
                        {booking.name}
                      </p>
                      <p className="text-xs text-mutedText">{booking.email}</p>
                    </td>
                    <td className="p-4 font-mono text-xs">{booking.inquiry_type || '—'}</td>
                    <td className="p-4 font-mono text-xs">{booking.style || '—'}</td>
                    <td className="p-4 text-xs text-mutedText">
                      {booking.artists?.name || "—"}
                    </td>
                    <td className="p-4 font-mono text-xs">
                      {booking.preferred_date
                        ? new Date(booking.preferred_date).toLocaleDateString()
                        : "Flexible"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${getStatusBadge(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/bookings/${booking.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-neon-purple"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
