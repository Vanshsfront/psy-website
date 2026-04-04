"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useImageUpload } from "@/hooks/useImageUpload";
import type { CustomerTestimonial } from "@/types";

interface TestimonialSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  testimonial: CustomerTestimonial | null;
  onSaved: () => void;
}

export default function TestimonialSlideOver({
  isOpen,
  onClose,
  testimonial,
  onSaved,
}: TestimonialSlideOverProps) {
  const isEditing = !!testimonial;
  const { toast } = useToast();
  const { upload } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Populate form
  useEffect(() => {
    if (testimonial && isOpen) {
      setCustomerName(testimonial.customer_name);
      setReviewText(testimonial.review_text || "");
      setRating(testimonial.rating ?? 5);
      setImageUrl(testimonial.image_url);
      setIsPublished(testimonial.is_published);
    } else if (!testimonial && isOpen) {
      setCustomerName("");
      setReviewText("");
      setRating(5);
      setImageUrl(null);
      setIsPublished(false);
    }
  }, [testimonial, isOpen]);

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await upload(file, "testimonial-images", "reviews");
      setImageUrl(result.url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setIsUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save
  const handleSave = useCallback(async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        review_text: reviewText.trim() || null,
        rating,
        image_url: imageUrl,
        is_published: isPublished,
      };

      const url = isEditing
        ? `/api/admin/testimonials/${testimonial!.id}`
        : "/api/admin/testimonials";

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
        isEditing ? "Testimonial updated" : "Testimonial created"
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save testimonial"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    customerName,
    reviewText,
    rating,
    imageUrl,
    isPublished,
    isEditing,
    testimonial,
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
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#111111] border-l border-[#2a2a2a] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
              <h2 className="font-display text-xl font-bold">
                {isEditing ? "Edit Testimonial" : "Add Testimonial"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Customer Name *
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Review Text
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={5}
                  placeholder="What the customer said..."
                  className="flex w-full rounded border border-[#2a2a2a] bg-ink px-3 py-2 text-sm text-bone focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-psy-green resize-none"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Rating
                </label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      className={`text-2xl transition-colors ${
                        i < rating ? "text-amber-400" : "text-[#2a2a2a]"
                      } hover:text-amber-300`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-taupe">
                  Review Screenshot
                </label>
                {imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-[#2a2a2a]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Review screenshot"
                      className="w-full aspect-video object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute top-2 right-2 p-1.5 rounded bg-black/70 hover:bg-terracotta/80 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full aspect-video rounded-lg border-2 border-dashed border-[#2a2a2a] hover:border-taupe/50 transition-colors flex flex-col items-center justify-center gap-2 text-taupe"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">
                      {isUploading ? "Uploading..." : "Upload screenshot"}
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
                <p className="text-xs text-taupe mt-1 ml-8">
                  Published testimonials appear on the studio page
                </p>
              </div>
            </div>

            {/* Sticky save bar */}
            <div className="shrink-0 border-t border-[#2a2a2a] bg-[#111111] px-6 py-4 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="neon"
                onClick={handleSave}
                disabled={isSaving || isUploading}
              >
                {isSaving
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Testimonial"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
