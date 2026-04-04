"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/useToast";
import type { CommunityPost } from "@/types";

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (post && isOpen) {
      setTitle(post.title);
      setType(post.type);
      setDescription(post.description || "");
      setEventDate(post.event_date ? post.event_date.split("T")[0] : "");
      setImageUrl(post.image_url);
      setImagePath(null);
      setIsPublished(post.is_published);
    } else if (!post && isOpen) {
      setTitle("");
      setType("event");
      setDescription("");
      setEventDate("");
      setImageUrl(null);
      setImagePath(null);
      setIsPublished(false);
    }
  }, [post, isOpen]);

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await upload(file, "community-images", "posts");
      setImageUrl(result.url);
      setImagePath(result.path);
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

  // Remove image
  const handleRemoveImage = async () => {
    if (imagePath) {
      try {
        await deleteFile("community-images", imagePath);
      } catch {
        // Silently ignore — image may already be deleted
      }
    }
    setImageUrl(null);
    setImagePath(null);
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
        title: title.trim(),
        type,
        description: description.trim() || null,
        event_date: type === "event" && eventDate ? eventDate : null,
        image_url: imageUrl,
        is_published: isPublished,
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
    imageUrl,
    isPublished,
    isEditing,
    post,
    onSaved,
    onClose,
    toast,
  ]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
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
                  Image
                </label>
                {imageUrl ? (
                  <div className="relative aspect-video bg-[#1a1a1a] rounded overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt="Post image"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-500/80 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-bone" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full aspect-video rounded border border-dashed border-[#2a2a2a] bg-[#1a1a1a] flex flex-col items-center justify-center gap-2 text-taupe hover:border-psy-green/40 hover:text-psy-green transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">
                      {isUploading ? "Uploading..." : "Click to upload image"}
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
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
