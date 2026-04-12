"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useGuestSpotLeads } from "@/hooks/useGuestSpotLeads";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import type { GuestSpotLead } from "@/types";

export default function GuestSpotLeadsPage() {
  const params = useParams();
  const guestSpotId = params.id as string;
  const { leads, isLoading, mutate } = useGuestSpotLeads({ guestSpotId });
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<GuestSpotLead | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/admin/guest-spot-leads/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");

      toast.success("Lead deleted");
      mutate();
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/guest-spots"
          className="inline-flex items-center gap-1.5 text-taupe text-caption hover:text-bone transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Guest Spots
        </Link>
        <h1 className="font-sans font-semibold text-2xl text-bone">
          Guest Spot Leads
        </h1>
        <p className="text-taupe text-caption mt-1">
          {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-[#1a1a1a] animate-pulse rounded"
            />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <p className="text-lg mb-2">No leads yet</p>
          <p className="text-sm">
            Leads will appear here when someone fills out the guest spot form.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left text-taupe text-caption uppercase tracking-wider font-medium py-3 pr-4">
                  Name
                </th>
                <th className="text-left text-taupe text-caption uppercase tracking-wider font-medium py-3 pr-4">
                  Email
                </th>
                <th className="text-left text-taupe text-caption uppercase tracking-wider font-medium py-3 pr-4">
                  Phone
                </th>
                <th className="text-left text-taupe text-caption uppercase tracking-wider font-medium py-3 pr-4">
                  Message
                </th>
                <th className="text-left text-taupe text-caption uppercase tracking-wider font-medium py-3 pr-4">
                  Date
                </th>
                <th className="py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-[#2a2a2a] hover:bg-surfaceLighter transition-colors"
                >
                  <td className="py-3 pr-4 text-bone">{lead.name}</td>
                  <td className="py-3 pr-4 text-taupe">
                    <a
                      href={`mailto:${lead.email}`}
                      className="hover:text-psy-green transition-colors"
                    >
                      {lead.email}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-taupe">
                    {lead.phone || "-"}
                  </td>
                  <td className="py-3 pr-4 text-taupe max-w-xs truncate">
                    {lead.message || "-"}
                  </td>
                  <td className="py-3 pr-4 text-taupe whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => setDeleteTarget(lead)}
                      className="p-2 hover:bg-terracotta/10 rounded transition-colors"
                      title="Delete lead"
                    >
                      <Trash2 className="w-4 h-4 text-terracotta" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-[#2a2a2a] p-6 max-w-md w-full"
            >
              <h3 className="font-display text-lg font-bold text-bone mb-2">
                Delete Lead
              </h3>
              <p className="text-sm text-taupe mb-6">
                Are you sure you want to delete the lead from &ldquo;
                {deleteTarget.name}&rdquo;? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                <button
                  onClick={confirmDelete}
                  className="h-10 px-4 bg-terracotta text-bone font-medium text-sm hover:bg-terracotta/80 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
