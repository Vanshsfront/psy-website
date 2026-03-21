"use client";

import { useState, useEffect } from "react";
import { Upload, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useToast } from "@/hooks/useToast";
import PortfolioCard from "@/components/admin/PortfolioCard";
import PortfolioUploadPanel from "@/components/admin/PortfolioUploadPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";

const STYLE_TAGS = [
  "All",
  "Traditional",
  "Neo-trad",
  "Blackwork",
  "Fine-line",
  "Geometric",
  "Custom",
];

interface Artist {
  id: string;
  name: string;
}

export default function AdminPortfolioPage() {
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState("All");
  const [artistFilter, setArtistFilter] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    artist_id: string;
    style_tag: string;
    description: string;
  } | null>(null);
  const { toast } = useToast();

  const { items, isLoading, mutate } = usePortfolio({
    artist: artistFilter || undefined,
    style: styleFilter === "All" ? undefined : styleFilter,
  });

  // Fetch artists for filter
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("artists")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setArtists(data);
      });
  }, []);

  // Filter by search (client-side for description matching)
  const filteredItems = search
    ? items.filter(
        (item) =>
          item.description?.toLowerCase().includes(search.toLowerCase()) ||
          item.style_tag?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  // Delete handler
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/portfolio/${deleteTarget}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: ["/studio", "/studio/gallery"],
        }),
      });

      toast.success("Photo removed from portfolio");
      mutate();
    } catch {
      toast.error("Failed to delete portfolio item");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Edit save handler
  const saveEdit = async () => {
    if (!editTarget) return;
    try {
      const res = await fetch(`/api/admin/portfolio/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_id: editTarget.artist_id || null,
          style_tag: editTarget.style_tag || null,
          description: editTarget.description || null,
        }),
      });
      if (!res.ok) throw new Error("Update failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: ["/studio", "/studio/gallery"],
        }),
      });

      toast.success("Portfolio item updated");
      mutate();
      setEditTarget(null);
    } catch {
      toast.error("Failed to update portfolio item");
    }
  };

  // Toggle featured handler
  const toggleFeatured = async (id: string, featured: boolean) => {
    try {
      const res = await fetch(`/api/admin/portfolio/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured }),
      });
      if (!res.ok) throw new Error("Update failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: ["/studio", "/studio/gallery"],
        }),
      });

      toast.success(featured ? "Featured on website" : "Removed from featured");
      mutate();
    } catch {
      toast.error("Failed to update featured status");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold">Portfolio</h1>
        <Button variant="neon" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-2" /> Upload Photos
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search portfolio..."
            className="pl-9"
          />
        </div>

        <select
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          className="h-10 rounded border border-borderDark bg-background px-3 text-sm text-primaryText focus:ring-1 focus:ring-neon-cyan outline-none"
        >
          <option value="">All Artists</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value)}
          className="h-10 rounded border border-borderDark bg-background px-3 text-sm text-primaryText focus:ring-1 focus:ring-neon-cyan outline-none"
        >
          {STYLE_TAGS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Structured grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#111] animate-pulse"
            >
              <div className="aspect-[9/16]" />
              <div className="h-10" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 text-mutedText">
          <p className="text-lg mb-2">No portfolio items found</p>
          <p className="text-sm">
            Click &quot;Upload Photos&quot; to add your first piece
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item as typeof item & { artists?: { name: string } | null }}
                onEdit={() =>
                  setEditTarget({
                    id: item.id,
                    artist_id: item.artist_id || "",
                    style_tag: item.style_tag || "",
                    description: item.description || "",
                  })
                }
                onDelete={() => setDeleteTarget(item.id)}
                onToggleFeatured={toggleFeatured}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload panel */}
      <PortfolioUploadPanel
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => mutate()}
      />

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
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
                Remove Photo
              </h3>
              <p className="text-sm text-mutedText mb-6">
                Remove this photo from the portfolio? This cannot be undone.
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

      {/* Edit modal (inline metadata editor) */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-borderDark rounded-lg p-6 max-w-md w-full space-y-4"
            >
              <h3 className="font-display text-lg font-bold">
                Edit Portfolio Item
              </h3>

              <div>
                <label className="block text-xs text-mutedText mb-1">
                  Artist
                </label>
                <select
                  value={editTarget.artist_id}
                  onChange={(e) =>
                    setEditTarget({
                      ...editTarget,
                      artist_id: e.target.value,
                    })
                  }
                  className="w-full h-10 rounded border border-borderDark bg-background px-3 text-sm text-primaryText outline-none focus:ring-1 focus:ring-neon-cyan"
                >
                  <option value="">Select Artist</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-mutedText mb-1">
                  Style Tag
                </label>
                <select
                  value={editTarget.style_tag}
                  onChange={(e) =>
                    setEditTarget({
                      ...editTarget,
                      style_tag: e.target.value,
                    })
                  }
                  className="w-full h-10 rounded border border-borderDark bg-background px-3 text-sm text-primaryText outline-none focus:ring-1 focus:ring-neon-cyan"
                >
                  <option value="">Select Style</option>
                  {STYLE_TAGS.filter((s) => s !== "All").map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-mutedText mb-1">
                  Description
                </label>
                <Input
                  value={editTarget.description}
                  onChange={(e) =>
                    setEditTarget({
                      ...editTarget,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditTarget(null)}
                >
                  Cancel
                </Button>
                <Button variant="neon" onClick={saveEdit}>
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
