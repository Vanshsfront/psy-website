"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useGuestSpots } from "@/hooks/useGuestSpots";
import { useToast } from "@/hooks/useToast";
import GuestSpotSlideOver from "@/components/admin/GuestSpotSlideOver";
import { Button } from "@/components/ui/button";
import type { GuestSpot } from "@/types";

export default function AdminGuestSpotsPage() {
  const { guestSpots, isLoading, mutate } = useGuestSpots();
  const { toast } = useToast();

  const [slideOpen, setSlideOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<GuestSpot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuestSpot | null>(null);

  const handleAdd = () => {
    setEditingSpot(null);
    setSlideOpen(true);
  };

  const handleEdit = (spot: GuestSpot) => {
    setEditingSpot(spot);
    setSlideOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/guest-spots/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/studio"] }),
      });

      toast.success(`"${deleteTarget.artist_name}" deleted`);
      mutate();
    } catch {
      toast.error("Failed to delete guest spot");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">
            Guest Spots
          </h1>
          <p className="text-taupe text-caption mt-1">
            {guestSpots.length} guest spot{guestSpots.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="neon" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Guest Spot
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1a1a] animate-pulse rounded aspect-[3/4]"
            />
          ))}
        </div>
      ) : guestSpots.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <p className="text-lg mb-2">No guest spots yet</p>
          <p className="text-sm">
            Click &ldquo;Add Guest Spot&rdquo; to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guestSpots.map((spot) => (
            <div
              key={spot.id}
              className="bg-surface border border-[#2a2a2a] rounded overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[3/4] bg-[#1a1a1a]">
                {spot.portfolio_images && spot.portfolio_images.length > 0 ? (
                  <Image
                    src={spot.portfolio_images[0]}
                    alt={spot.artist_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-taupe/40 text-sm">
                    No image
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg text-bone">
                    {spot.artist_name}
                  </h3>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded ${
                      spot.is_published
                        ? "bg-psy-green/10 text-psy-green"
                        : "bg-taupe/10 text-taupe"
                    }`}
                  >
                    {spot.is_published ? "Published" : "Draft"}
                  </span>
                </div>

                {spot.dates_available && (
                  <p className="text-taupe text-caption">
                    {spot.dates_available}
                  </p>
                )}

                {spot.instagram && (
                  <p className="text-taupe text-caption">{spot.instagram}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Link
                    href={`/admin/guest-spots/${spot.id}/leads`}
                    className="text-xs text-psy-green hover:text-psy-green/80 transition-colors underline underline-offset-2"
                  >
                    View Leads
                  </Link>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(spot)}
                      className="p-2 hover:bg-surfaceLighter rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-taupe hover:text-bone" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(spot)}
                      className="p-2 hover:bg-terracotta/10 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-terracotta" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over */}
      <GuestSpotSlideOver
        isOpen={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditingSpot(null);
        }}
        guestSpot={editingSpot}
        onSaved={() => mutate()}
      />

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
                Delete Guest Spot
              </h3>
              <p className="text-sm text-taupe mb-6">
                Are you sure you want to delete &ldquo;
                {deleteTarget.artist_name}&rdquo;? This action cannot be undone.
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
