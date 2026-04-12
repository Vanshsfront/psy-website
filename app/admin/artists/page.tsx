"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Instagram,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useArtists } from "@/hooks/useArtists";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import type { Artist } from "@/types";

export default function AdminArtistsPage() {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Artist | null>(null);
  const { artists, isLoading, mutate } = useArtists();
  const { toast } = useToast();

  // Client-side search filtering
  const filteredArtists = useMemo(() => {
    if (!search.trim()) return artists;
    const q = search.toLowerCase();
    return artists.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.speciality?.toLowerCase().includes(q) ||
        a.instagram?.toLowerCase().includes(q)
    );
  }, [artists, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/artists/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: ["/studio", "/studio/artists"],
        }),
      });

      toast.success(`"${deleteTarget.name}" has been removed`);
      mutate();
    } catch {
      toast.error("Failed to delete artist");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">
            Resident Artists
          </h1>
          <p className="text-taupe text-caption mt-1">
            {artists.length} artist{artists.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/artists/new">
          <Button variant="neon" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Artist
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 bg-ink z-10 py-3 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            className="w-full border-0 border-b border-[#2a2a2a] bg-transparent pl-6 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
          />
        </div>

        <span className="ml-auto text-taupe text-caption">
          Showing {filteredArtists.length} of {artists.length}
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#1a1a1a] animate-pulse">
              <div className="h-48" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-[#2a2a2a] rounded w-2/3" />
                <div className="h-3 bg-[#2a2a2a] rounded w-1/2" />
                <div className="h-16 bg-[#2a2a2a] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <Users className="w-10 h-10 mx-auto mb-4 text-taupe/40" />
          <p className="text-lg mb-2">No artists found</p>
          <p className="text-sm">
            {search
              ? "Try adjusting your search"
              : "Click 'Add Artist' to recruit your first resident"}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtists.map((artist) => (
              <motion.div
                key={artist.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="bg-surface border border-borderDark rounded overflow-hidden flex flex-col hover:border-[#3a3a3a] transition-colors"
              >
                {/* Image */}
                <div className="h-48 bg-surfaceLighter relative">
                  {artist.profile_photo_url ? (
                    <img
                      src={artist.profile_photo_url}
                      alt={artist.name}
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-mutedText border-b border-borderDark">
                      No Image
                    </div>
                  )}
                  {artist.speciality && (
                    <div className="absolute top-3 right-3 bg-background/80 backdrop-blur px-2 py-1 text-xs font-mono rounded text-neon-purple border border-borderDark">
                      {artist.speciality}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-display font-bold text-xl mb-1">
                    {artist.name}
                  </h3>
                  <p className="text-sm text-mutedText font-mono mb-4">
                    /{artist.slug}
                  </p>

                  {artist.instagram && (
                    <a
                      href={`https://instagram.com/${artist.instagram.replace(
                        "@",
                        ""
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-mutedText hover:text-white transition-colors mb-4 inline-block w-fit"
                    >
                      <Instagram className="w-4 h-4" /> {artist.instagram}
                    </a>
                  )}

                  <p className="text-sm text-mutedText line-clamp-3 mb-6 flex-1">
                    {artist.bio}
                  </p>

                  {/* Action row */}
                  <div className="pt-4 border-t border-borderDark flex justify-between items-center mt-auto">
                    <span className="text-xs text-mutedText font-mono">
                      {new Date(artist.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/admin/artists/${artist.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-mutedText hover:text-neon-cyan"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-mutedText hover:text-danger"
                        onClick={() => setDeleteTarget(artist)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-borderDark rounded-lg p-6 max-w-sm w-full"
            >
              <h3 className="font-display text-lg font-bold mb-2">
                Remove Artist
              </h3>
              <p className="text-sm text-mutedText mb-6">
                Are you sure you want to remove &ldquo;{deleteTarget.name}
                &rdquo;? Their portfolio items will be preserved but unlinked.
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
                  className="h-10 px-4 rounded bg-danger text-white font-medium text-sm hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
