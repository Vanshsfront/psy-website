"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/useToast";
import type { GuestSpot } from "@/types";

interface GuestSpotSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  guestSpot: GuestSpot | null;
  onSaved: () => void;
}

export default function GuestSpotSlideOver({
  isOpen,
  onClose,
  guestSpot,
  onSaved,
}: GuestSpotSlideOverProps) {
  const isEditing = !!guestSpot;
  const { toast } = useToast();
  const { upload } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [datesAvailable, setDatesAvailable] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (guestSpot && isOpen) {
      setArtistName(guestSpot.artist_name);
      setBio(guestSpot.bio || "");
      setInstagram(guestSpot.instagram || "");
      setDatesAvailable(guestSpot.dates_available || "");
      setDateStart(guestSpot.date_start || "");
      setDateEnd(guestSpot.date_end || "");
      setPortfolioImages(guestSpot.portfolio_images || []);
      setIsPublished(guestSpot.is_published);
    } else if (!guestSpot && isOpen) {
      setArtistName("");
      setBio("");
      setInstagram("");
      setDatesAvailable("");
      setDateStart("");
      setDateEnd("");
      setPortfolioImages([]);
      setIsPublished(false);
    }
  }, [guestSpot, isOpen]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) =>
        upload(file, "guest-spot-images", "spots")
      );
      const results = await Promise.all(uploadPromises);
      setPortfolioImages((prev) => [...prev, ...results.map((r) => r.url)]);
      toast.success(`${results.length} image${results.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setPortfolioImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = useCallback(async () => {
    if (!artistName.trim()) {
      toast.error("Artist name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        artist_name: artistName.trim(),
        bio: bio.trim() || null,
        instagram: instagram.trim() || null,
        dates_available: datesAvailable.trim() || null,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        portfolio_images: portfolioImages,
        is_published: isPublished,
      };

      const url = isEditing
        ? `/api/admin/guest-spots/${guestSpot!.id}`
        : `/api/admin/guest-spots`;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Save failed");
      }

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/studio"] }),
      });

      toast.success(
        isEditing ? "Guest spot updated!" : "Guest spot created!"
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save guest spot"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    artistName,
    bio,
    instagram,
    datesAvailable,
    dateStart,
    dateEnd,
    portfolioImages,
    isPublished,
    isEditing,
    guestSpot,
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
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[680px] bg-background border-l border-borderDark flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-borderDark shrink-0">
              <h2 className="font-display text-xl font-bold">
                {isEditing ? "Edit Guest Spot" : "Add Guest Spot"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surfaceLighter rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
              {/* Artist Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-mutedText">
                  Artist Name *
                </label>
                <Input
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Artist name"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-mutedText">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Brief bio or description..."
                  className="flex w-full rounded border border-borderDark bg-background px-3 py-2 text-sm text-primaryText focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan resize-none"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-mutedText">
                  Instagram
                </label>
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@handle"
                />
              </div>

              {/* Dates Available */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-mutedText">
                  Dates Available
                </label>
                <Input
                  value={datesAvailable}
                  onChange={(e) => setDatesAvailable(e.target.value)}
                  placeholder="e.g. April 15-20, 2026"
                />
              </div>

              {/* Date Start / End */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Date Start
                  </label>
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Date End
                  </label>
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Portfolio Images */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-mutedText">
                  Portfolio Images
                </label>

                {portfolioImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {portfolioImages.map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-square bg-[#1a1a1a] rounded overflow-hidden group"
                      >
                        <Image
                          src={url}
                          alt={`Portfolio ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-terracotta" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Add Images"}
                </Button>
              </div>

              {/* Published toggle */}
              <div className="border-t border-borderDark pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-5 h-5 accent-neon-green bg-background border-borderDark rounded"
                  />
                  <span className="text-sm font-medium">Published</span>
                </label>
              </div>
            </div>

            {/* Sticky save bar */}
            <div className="shrink-0 border-t border-borderDark bg-surface px-6 py-4 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="neon"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Guest Spot"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
