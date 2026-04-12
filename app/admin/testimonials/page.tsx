"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTestimonials } from "@/hooks/useTestimonials";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import TestimonialSlideOver from "@/components/admin/TestimonialSlideOver";
import type { CustomerTestimonial } from "@/types";

export default function AdminTestimonialsPage() {
  const { testimonials, isLoading, mutate } = useTestimonials();
  const { toast } = useToast();

  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerTestimonial | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<CustomerTestimonial | null>(
    null
  );

  const openAdd = () => {
    setEditTarget(null);
    setSlideOverOpen(true);
  };

  const openEdit = (t: CustomerTestimonial) => {
    setEditTarget(t);
    setSlideOverOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/testimonials/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/studio"] }),
      });

      toast.success("Testimonial deleted");
      mutate();
    } catch {
      toast.error("Failed to delete testimonial");
    } finally {
      setDeleteTarget(null);
    }
  };

  const renderStars = (rating: number | null) => {
    const filled = rating ?? 0;
    return (
      <span className="text-sm tracking-wide">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={i < filled ? "text-amber-400" : "text-[#2a2a2a]"}
          >
            ★
          </span>
        ))}
      </span>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Testimonials</h1>
          {!isLoading && (
            <p className="text-sm text-taupe mt-1">
              {testimonials.length} testimonial
              {testimonials.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button variant="neon" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Testimonial
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#111111] animate-pulse rounded-lg border border-[#2a2a2a]"
            >
              <div className="aspect-video" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-[#1a1a1a] rounded w-1/2" />
                <div className="h-4 bg-[#1a1a1a] rounded w-1/3" />
                <div className="h-12 bg-[#1a1a1a] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <p className="text-lg mb-2">No testimonials yet</p>
          <p className="text-sm">
            Click &quot;Add Testimonial&quot; to add your first review
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {testimonials.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111111] rounded-lg border border-[#2a2a2a] overflow-hidden"
              >
                {/* Image thumbnail */}
                {t.image_url && (
                  <div className="aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.image_url}
                      alt={`Review by ${t.customer_name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 space-y-2">
                  {/* Name */}
                  <h3 className="font-display text-lg text-bone">
                    {t.customer_name}
                  </h3>

                  {/* Stars */}
                  {renderStars(t.rating)}

                  {/* Review excerpt */}
                  {t.review_text && (
                    <p className="text-taupe italic text-sm leading-relaxed">
                      {t.review_text.length > 120
                        ? `${t.review_text.slice(0, 120)}...`
                        : t.review_text}
                    </p>
                  )}

                  {/* Badge + actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        t.is_published
                          ? "border-psy-green/40 text-psy-green bg-psy-green/10"
                          : "border-[#2a2a2a] text-taupe bg-[#1a1a1a]"
                      }`}
                    >
                      {t.is_published ? "Published" : "Draft"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="p-1.5 rounded hover:bg-[#1a1a1a] transition-colors text-taupe hover:text-bone"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="p-1.5 rounded hover:bg-terracotta/10 transition-colors text-taupe hover:text-terracotta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Slide-over */}
      <TestimonialSlideOver
        isOpen={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        testimonial={editTarget}
        onSaved={() => mutate()}
      />

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
              className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6 max-w-sm w-full"
            >
              <h3 className="font-display text-lg font-bold mb-2">
                Delete Testimonial
              </h3>
              <p className="text-sm text-taupe mb-6">
                Delete the testimonial from{" "}
                <span className="text-bone font-medium">
                  {deleteTarget.customer_name}
                </span>
                ? This cannot be undone.
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
                  className="h-10 px-4 rounded bg-terracotta text-white font-medium text-sm hover:bg-terracotta/80 transition-colors"
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
