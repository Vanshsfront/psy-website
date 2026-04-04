"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { useToast } from "@/hooks/useToast";
import CommunityPostSlideOver from "@/components/admin/CommunityPostSlideOver";
import { Button } from "@/components/ui/button";
import type { CommunityPost } from "@/types";

const POST_TYPES = ["All", "Event", "Collab", "Announcement"] as const;

function typeBadge(type: CommunityPost["type"]) {
  const map: Record<
    CommunityPost["type"],
    { bg: string; text: string; label: string }
  > = {
    event: {
      bg: "bg-psy-green/20",
      text: "text-psy-green",
      label: "Event",
    },
    collab: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      label: "Collab",
    },
    announcement: {
      bg: "bg-taupe/20",
      text: "text-taupe",
      label: "Announcement",
    },
  };
  const { bg, text, label } = map[type];
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${bg} ${text}`}
    >
      {label}
    </span>
  );
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCommunityPage() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunityPost | null>(null);
  const { toast } = useToast();

  const { posts: allPosts, isLoading, mutate } = useCommunityPosts();

  // Client-side filtering
  const filteredPosts = useMemo(() => {
    if (typeFilter === "All") return allPosts;
    return allPosts.filter(
      (p) => p.type === typeFilter.toLowerCase()
    );
  }, [allPosts, typeFilter]);

  const handleAdd = () => {
    setEditingPost(null);
    setSlideOpen(true);
  };

  const handleEdit = (post: CommunityPost) => {
    setEditingPost(post);
    setSlideOpen(true);
  };

  const handleDelete = (post: CommunityPost) => {
    setDeleteTarget(post);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/community/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/studio"] }),
      });

      toast.success(`"${deleteTarget.title}" deleted`);
      mutate();
    } catch {
      toast.error("Failed to delete post");
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
            Community
          </h1>
          <p className="text-taupe text-caption mt-1">
            {allPosts.length} post{allPosts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="neon" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Post
        </Button>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 bg-ink z-10 py-3 mb-6 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 border border-[#2a2a2a] bg-ink px-3 text-sm text-bone focus:ring-1 focus:ring-psy-green outline-none"
        >
          {POST_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <span className="ml-auto text-taupe text-caption">
          {filteredPosts.length} result{filteredPosts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video bg-[#1a1a1a] animate-pulse rounded"
            />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <p className="text-lg mb-2">No posts found</p>
          <p className="text-sm">
            {typeFilter !== "All"
              ? "Try adjusting your filter"
              : "Click 'Add Post' to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="group bg-surface border border-[#2a2a2a] rounded overflow-hidden hover:border-psy-green/40 transition-colors"
            >
              {/* Image */}
              {post.image_url && (
                <div className="relative aspect-video bg-[#1a1a1a]">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {typeBadge(post.type)}
                  <span
                    className={`text-xs font-medium ${
                      post.is_published ? "text-psy-green" : "text-taupe"
                    }`}
                  >
                    {post.is_published ? "Published" : "Draft"}
                  </span>
                </div>

                <h3 className="text-bone font-sans font-medium text-sm leading-snug">
                  {post.title}
                </h3>

                {post.description && (
                  <p className="text-taupe text-xs leading-relaxed">
                    {post.description.length > 100
                      ? `${post.description.slice(0, 100)}...`
                      : post.description}
                  </p>
                )}

                {post.type === "event" && post.event_date && (
                  <p className="text-xs text-psy-green/80">
                    {formatEventDate(post.event_date)}
                  </p>
                )}

                {/* Hover actions */}
                <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(post)}
                    className="text-xs text-bone border border-[#2a2a2a] px-3 py-1.5 hover:border-psy-green hover:text-psy-green transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    className="text-xs text-taupe border border-[#2a2a2a] px-3 py-1.5 hover:border-red-500 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over */}
      <CommunityPostSlideOver
        isOpen={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditingPost(null);
        }}
        post={editingPost}
        onSaved={() => mutate()}
      />

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-[#2a2a2a] p-6 max-w-md w-full"
            >
              <h3 className="font-display text-lg font-bold text-bone mb-2">
                Delete Post
              </h3>
              <p className="text-sm text-taupe mb-6">
                Are you sure you want to delete &ldquo;{deleteTarget.title}
                &rdquo;? This action cannot be undone.
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
