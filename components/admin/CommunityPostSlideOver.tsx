"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEditor, EditorContent } from "@tiptap/react";
import RichTextToolbar from "@/components/admin/RichTextToolbar";
import { richTextExtensions } from "@/lib/tiptap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/useToast";
import type { CommunityPost } from "@/types";
import { stripDashes } from "@/lib/sanitizeText";

interface CommunityPostSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  post: CommunityPost | null;
  onSaved: () => void;
}

export default function CommunityPostSlideOver({
  isOpen,
  onClose,
  post,
  onSaved,
}: CommunityPostSlideOverProps) {
  const isEditing = !!post;
  const { toast } = useToast();
  const { upload, deleteFile } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CommunityPost["type"]>("event");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  // The first entry is the cover: it is what the grid cards show and what gets
  // written back to the legacy `image_url` column.
  const [images, setImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [featureOnHomepage, setFeatureOnHomepage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Rich text editor for content
  const editor = useEditor({
    immediatelyRender: false,
    extensions: richTextExtensions("Write full post content here..."),
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[120px] p-3",
      },
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (post && isOpen) {
      setTitle(post.title);
      setType(post.type);
      setDescription(post.description || "");
      setEventDate(post.event_date ? post.event_date.split("T")[0] : "");
      setImages(post.images?.length ? post.images : post.image_url ? [post.image_url] : []);
      setIsPublished(post.is_published);
      setFeatureOnHomepage(post.feature_on_homepage ?? false);
      editor?.commands.setContent(post.content || "");
    } else if (!post && isOpen) {
      setTitle("");
      setType("event");
      setDescription("");
      setEventDate("");
      setImages([]);
      setIsPublished(false);
      setFeatureOnHomepage(false);
      editor?.commands.setContent("");
    }
  }, [post, isOpen, editor]);

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const results = await Promise.all(
        Array.from(files).map((file) => upload(file, "community-images", "posts"))
      );
      setImages((prev) => [...prev, ...results.map((r) => r.url)]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Drops the image from the post. The file is deliberately left in the bucket:
  // an editor can remove an image and then cancel, and the same URL may be
  // reused by another post, so deleting here risks breaking a live page.
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const makeCover = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      return [picked, ...next];
    });
  };

  // Save
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: stripDashes(title.trim()),
        type,
        description: stripDashes(description.trim() || null),
        content: stripDashes(editor?.getHTML() || null),
        event_date: type === "event" && eventDate ? eventDate : null,
        // image_url stays the cover so the grid cards and any older consumer keep
        // working; `images` carries the full gallery.
        image_url: images[0] ?? null,
        images,
        is_published: isPublished,
        feature_on_homepage: featureOnHomepage,
      };

      const url = isEditing
        ? `/api/admin/community/${post!.id}`
        : `/api/admin/community`;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Save failed");
      }

      // Revalidate studio page
      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/studio"] }),
      });

      toast.success(
        isEditing ? "Post updated successfully!" : "Post created successfully!"
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save post"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    type,
    description,
    eventDate,
    images,
    isPublished,
    featureOnHomepage,
    isEditing,
    post,
    onSaved,
    onClose,
    toast,
    editor,
  ]);

  // Escape key + full scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const scrollY = window.scrollY;
    const html = document.documentElement;
    const mainEl = document.querySelector("main") as HTMLElement | null;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    if (mainEl) mainEl.style.overflow = "hidden";

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      html.style.overflow = "";
      html.style.overscrollBehavior = "";
      if (mainEl) mainEl.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-surface border-l border-[#2a2a2a] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
              <h2 className="font-display text-xl font-bold text-bone">
                {isEditing ? "Edit Post" : "Add New Post"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surfaceLighter rounded transition-colors"
              >
                <X className="w-5 h-5 text-taupe" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 space-y-6">
              {/* Title */}
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

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as CommunityPost["type"])
                  }
                  className="flex h-10 w-full rounded border border-[#2a2a2a] bg-ink px-3 py-2 text-sm text-bone focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-psy-green"
                >
                  <option value="event">Event</option>
                  <option value="collab">Collab</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Write a description..."
                  className="flex w-full rounded border border-[#2a2a2a] bg-ink px-3 py-2 text-sm text-bone placeholder:text-taupe/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-psy-green resize-none"
                />
              </div>

              {/* Full Content (rich text) */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Full Content
                </label>
                <div className="rounded border border-[#2a2a2a] bg-ink overflow-hidden">
                  <RichTextToolbar editor={editor} />
                  <EditorContent editor={editor} />
                </div>
                <p className="text-xs text-taupe/60 mt-1">
                  Rich text content shown when post is expanded
                </p>
              </div>

              {/* Event Date (only for events) */}
              {type === "event" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-taupe">
                    Event Date
                  </label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Images
                </label>
                {images.length > 0 && (
                  <>
                    <p className="text-xs text-taupe/60 mb-2">
                      The first image is the cover shown on the community grid.
                      Click another to promote it.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {images.map((url, i) => (
                        <div
                          key={`${url}-${i}`}
                          className={`relative aspect-video bg-[#1a1a1a] rounded overflow-hidden group ${
                            i === 0 ? "ring-2 ring-psy-green" : ""
                          }`}
                        >
                          <Image src={url} alt={`Post image ${i + 1}`} fill className="object-cover" />
                          {i === 0 ? (
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-psy-green text-ink text-[10px] uppercase tracking-wider">
                              Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => makeCover(i)}
                              className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-bone text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Make cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(i)}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-500/80 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-bone" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full rounded border border-dashed border-[#2a2a2a] bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-taupe hover:border-psy-green/40 hover:text-psy-green transition-colors disabled:opacity-50 ${
                    images.length > 0 ? "py-4" : "aspect-video"
                  }`}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">
                    {isUploading
                      ? "Uploading..."
                      : images.length > 0
                        ? "Add more images"
                        : "Click to upload images"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Published toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-5 h-5 accent-psy-green bg-ink border-[#2a2a2a] rounded"
                  />
                  <span className="text-sm font-medium text-bone">
                    Published
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={featureOnHomepage}
                    onChange={(e) => setFeatureOnHomepage(e.target.checked)}
                    className="w-5 h-5 accent-psy-green bg-ink border-[#2a2a2a] rounded"
                  />
                  <span className="text-sm font-medium text-bone">
                    Feature in &ldquo;What&rsquo;s New&rdquo;
                  </span>
                </label>
                <p className="text-xs text-taupe/60 mt-1 ml-8">
                  Shows this post above the portfolio on the studio homepage. The
                  three most recent featured posts appear; it must be published too.
                </p>
              </div>
            </div>

            {/* Sticky save bar */}
            <div className="shrink-0 border-t border-[#2a2a2a] bg-surface px-6 py-4 flex items-center justify-end">
              <Button
                type="button"
                variant="neon"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
