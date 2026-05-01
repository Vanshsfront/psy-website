"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload } from "lucide-react";
import Image from "next/image";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/useToast";
import type { BlogPost } from "@/types";

interface BlogPostSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  post: BlogPost | null;
  onSaved: () => void;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function BlogPostSlideOver({
  isOpen,
  onClose,
  post,
  onSaved,
}: BlogPostSlideOverProps) {
  const isEditing = !!post;
  const { toast } = useToast();
  const { upload, deleteFile } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write the full post here…" }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm focus:outline-none min-h-[280px] p-3",
      },
    },
  });

  useEffect(() => {
    if (post && isOpen) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt || "");
      setAuthor(post.author || "");
      setCoverUrl(post.cover_image_url);
      setCoverPath(null);
      setIsPublished(post.is_published);
      setSlugTouched(true);
      editor?.commands.setContent(post.content || "");
    } else if (!post && isOpen) {
      setTitle("");
      setSlug("");
      setExcerpt("");
      setAuthor("");
      setCoverUrl(null);
      setCoverPath(null);
      setIsPublished(false);
      setSlugTouched(false);
      editor?.commands.setContent("");
    }
  }, [post, isOpen, editor]);

  // Auto-derive slug from title until the user touches the slug field directly.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await upload(file, "community-images", "blog");
      setCoverUrl(result.url);
      setCoverPath(result.path);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (coverPath) {
      try {
        await deleteFile("community-images", coverPath);
      } catch {
        // ignore
      }
    }
    setCoverUrl(null);
    setCoverPath(null);
  };

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const html = editor?.getHTML() || "";
    if (!html.trim() || html === "<p></p>") {
      toast.error("Content is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        excerpt: excerpt.trim() || null,
        content: html,
        cover_image_url: coverUrl,
        author: author.trim() || null,
        is_published: isPublished,
      };

      const url = isEditing
        ? `/api/admin/blog-posts/${post!.id}`
        : `/api/admin/blog-posts`;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/studio", `/studio/blog/${payload.slug}`] }),
      });

      toast.success(isEditing ? "Post updated" : "Post created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [title, slug, excerpt, coverUrl, author, isPublished, isEditing, post, onSaved, onClose, toast, editor]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-surface border-l border-[#2a2a2a] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
              <h2 className="font-display text-xl font-bold text-bone">
                {isEditing ? "Edit Post" : "New Blog Post"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surfaceLighter rounded transition-colors"
              >
                <X className="w-5 h-5 text-taupe" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Slug
                </label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="auto-derived from title"
                />
                <p className="mt-1 text-xs text-taupe/70">
                  Public URL: /studio/blog/{slug || "your-slug"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Excerpt
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short summary shown on the listing page"
                  rows={2}
                  className="flex w-full rounded border border-[#2a2a2a] bg-ink px-3 py-2 text-sm text-bone focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-psy-green resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Author
                </label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Yogesh"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Cover image
                </label>
                {coverUrl ? (
                  <div className="relative aspect-[16/9] bg-ink border border-[#2a2a2a] rounded overflow-hidden">
                    <Image src={coverUrl} alt="Cover" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-ink/80 border border-[#2a2a2a] rounded hover:border-red-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex flex-col items-center justify-center gap-2 w-full aspect-[16/9] bg-ink border border-dashed border-[#2a2a2a] rounded hover:border-psy-green/50 transition-colors text-taupe disabled:opacity-50"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">
                      {isUploading ? "Uploading…" : "Upload cover image"}
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Content *
                </label>
                <div className="border border-[#2a2a2a] rounded bg-ink">
                  <EditorContent editor={editor} />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-psy-green"
                />
                <span className="text-sm text-bone">Publish (visible on website)</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-[#2a2a2a] flex justify-end gap-3 shrink-0">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="neon" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : isEditing ? "Update post" : "Create post"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
