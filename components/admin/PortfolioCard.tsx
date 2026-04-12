"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, X as XIcon, Star } from "lucide-react";

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface PortfolioCardProps {
  item: {
    id: string;
    image_url: string;
    artist_id: string | null;
    style_tag: string | null;
    description: string | null;
    featured?: boolean;
    artists?: { name: string } | null;
  };
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured?: (id: string, featured: boolean) => void;
}

export default function PortfolioCard({
  item,
  onEdit,
  onDelete,
  onToggleFeatured,
}: PortfolioCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.4, ease: PSY_EASE }}
        className="group relative overflow-hidden cursor-pointer bg-[#111]"
        onClick={() => setLightboxOpen(true)}
      >
        {/* Fixed aspect ratio image */}
        <div className="relative aspect-[9/16] overflow-hidden">
          <img
            src={item.image_url}
            alt={item.description || "Portfolio piece"}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
            {/* Top row — actions */}
            <div className="flex justify-between">
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1.5 bg-white/10 backdrop-blur rounded hover:bg-white/20 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFeatured?.(item.id, !item.featured);
                  }}
                  className={`p-1.5 backdrop-blur rounded transition-all ${
                    item.featured
                      ? "bg-gold/30 hover:bg-gold/40"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                  title={item.featured ? "Unfeature" : "Feature on site"}
                >
                  <Star className={`w-3.5 h-3.5 transition-colors ${
                    item.featured ? "text-gold fill-gold" : "text-white"
                  }`} />
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 bg-terracotta/60 rounded hover:bg-terracotta transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Bottom row — metadata */}
            <div className="flex items-end justify-between">
              <span className="text-xs text-white/90 font-medium">
                {item.artists?.name || "Unknown Artist"}
              </span>
              {item.style_tag && (
                <span className="text-[10px] bg-psy-green/20 text-psy-green px-1.5 py-0.5 uppercase tracking-wider font-sans">
                  {item.style_tag}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata row below image — always visible */}
        <div className="px-3 py-2.5 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-bone/80 font-sans truncate">
              {item.artists?.name || "Unknown"}
            </span>
            <div className="flex items-center gap-2">
              {item.featured && (
                <Star className="w-3 h-3 text-gold fill-gold" />
              )}
              {item.style_tag && (
                <span className="text-[10px] text-taupe uppercase tracking-wider font-sans">
                  {item.style_tag}
                </span>
              )}
            </div>
          </div>
          {item.description && (
            <p className="text-[11px] text-taupe/60 mt-1 truncate">
              {item.description}
            </p>
          )}
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 transition-colors z-10"
              onClick={() => setLightboxOpen(false)}
            >
              <XIcon className="w-5 h-5 text-white" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: PSY_EASE }}
              src={item.image_url}
              alt={item.description || "Portfolio piece"}
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
