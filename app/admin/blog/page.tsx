"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useToast } from "@/hooks/useToast";
import BlogPostSlideOver from "@/components/admin/BlogPostSlideOver";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@/types";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminBlogPage() {
  const { posts, isLoading, mutate } = useBlogPosts();
  const { toast } = useToast();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const handleAdd = () => {
    setEditingPost(null);
    setSlideOpen(true);
  };

  const handleEdit = (p: BlogPost) => {
    setEditingPost(p);
    setSlideOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/blog-posts/${deleteTarget.id}`, {
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
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">Blog</h1>
          <p className="text-taupe text-caption mt-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="neon" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> New post
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="aspect-video bg-[#1a1a1a] animate-pulse rounded"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-taupe">
            <p className="text-lg mb-2">No blog posts yet</p>
            <p className="text-sm">Click &ldquo;New post&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group bg-surface border border-[#2a2a2a] rounded overflow-hidden hover:border-psy-green/40 transition-colors"
              >
                {post.cover_image_url && (
                  <div className="relative aspect-video bg-[#1a1a1a]">
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        post.is_published ? "text-psy-green" : "text-taupe"
                      }`}
                    >
                      {post.is_published ? "Published" : "Draft"}
                    </span>
                    <span className="text-xs text-taupe">
                      · {formatDate(post.published_at ?? post.created_at)}
                    </span>
                  </div>
                  <h3 className="text-bone font-sans font-medium text-sm leading-snug">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-taupe text-xs leading-relaxed">
                      {post.excerpt.length > 120
                        ? `${post.excerpt.slice(0, 120)}…`
                        : post.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-taupe/70 font-mono truncate">
                    /studio/blog/{post.slug}
                  </p>
                  <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(post)}
                      className="text-xs text-bone border border-[#2a2a2a] px-3 py-1.5 hover:border-psy-green hover:text-psy-green transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(post)}
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
      </div>

      <BlogPostSlideOver
        isOpen={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditingPost(null);
        }}
        post={editingPost}
        onSaved={() => mutate()}
      />

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
                Delete post
              </h3>
              <p className="text-sm text-taupe mb-6">
                Are you sure you want to delete &ldquo;{deleteTarget.title}&rdquo;? This
                cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
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
