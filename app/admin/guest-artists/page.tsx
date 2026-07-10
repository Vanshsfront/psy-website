"use client";

import { useState } from "react";
import { Check, X, ExternalLink, Mail, Phone } from "lucide-react";
import {
  useGuestArtistApplications,
  type GuestArtistApplication,
} from "@/hooks/useGuestArtistApplications";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusBadge: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  approved: "bg-psy-green/10 text-psy-green border-psy-green/30",
  rejected: "bg-danger/10 text-danger border-danger/30",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminGuestArtistsPage() {
  const { applications, isLoading, mutate } = useGuestArtistApplications();
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  const act = async (app: GuestArtistApplication, action: "approve" | "reject") => {
    setBusyId(app.id);
    try {
      const res = await fetch(`/api/admin/guest-artist-applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(
        action === "approve"
          ? "Approved — draft guest spot created"
          : "Application rejected"
      );
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold">Guest Artist Applications</h1>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {STATUS_FILTERS.map((s) => {
          const count =
            s === "all"
              ? applications.length
              : applications.filter((a) => a.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded text-sm capitalize transition-colors border ${
                filter === s
                  ? "bg-surfaceLighter text-white border-neon-green"
                  : "bg-transparent text-mutedText border-borderDark hover:text-white"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-[#111] animate-pulse rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-mutedText">
          <p className="text-lg">No applications here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-surface border border-borderDark rounded-lg p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg font-bold">
                      {app.first_name} {app.last_name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                        statusBadge[app.status] || ""
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-mutedText">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {app.email}
                    </span>
                    {app.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {app.phone}
                      </span>
                    )}
                    {app.type_of_artist && <span>{app.type_of_artist}</span>}
                    {app.years_experience != null && (
                      <span>{app.years_experience} yrs exp</span>
                    )}
                    <span>Applied {formatDate(app.created_at)}</span>
                  </div>
                  {app.portfolio_link && (
                    <a
                      href={app.portfolio_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-neon-cyan hover:underline mt-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {app.portfolio_link}
                    </a>
                  )}
                </div>

                {app.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="neon"
                      disabled={busyId === app.id}
                      onClick={() => act(app, "approve")}
                    >
                      <Check className="w-4 h-4 mr-1.5" /> Approve
                    </Button>
                    <button
                      disabled={busyId === app.id}
                      onClick={() => act(app, "reject")}
                      className="h-10 px-4 rounded border border-borderDark text-mutedText hover:text-danger hover:border-danger transition-colors text-sm font-medium inline-flex items-center disabled:opacity-50"
                    >
                      <X className="w-4 h-4 mr-1.5" /> Reject
                    </button>
                  </div>
                )}
              </div>

              {app.images.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mt-4">
                  {app.images.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt="Portfolio"
                        className="w-full aspect-square object-cover rounded bg-[#1a1a1a] hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              )}

              {app.status === "approved" && app.guest_spot_id && (
                <p className="text-xs text-mutedText mt-3">
                  A draft guest spot was created. Publish it from{" "}
                  <span className="text-neon-green">Guest Spots</span>.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
