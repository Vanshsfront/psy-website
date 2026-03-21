"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2, Star } from "lucide-react";
import Image from "next/image";
import type { Product } from "@/types";

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function getStatusBadge(product: Product) {
  if (product.is_deleted) {
    return { label: "DELETED", className: "bg-terracotta/20 text-terracotta" };
  }
  if (product.stock_status) {
    return { label: "LIVE", className: "bg-psy-green/15 text-psy-green" };
  }
  return { label: "DRAFT", className: "bg-[#2a2a2a] text-taupe" };
}

export default function ProductCard({
  product,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const badge = getStatusBadge(product);
  const primaryImage = product.images?.[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: PSY_EASE }}
      className="bg-[#111111] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors duration-300 cursor-pointer group"
      onClick={() => onEdit(product)}
    >
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-[#1a1a1a]">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display italic text-taupe/40 text-body-lg">
              No image
            </span>
          </div>
        )}

        {/* Status badge — top left */}
        <span
          className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>

        {/* Featured star — top right */}
        {product.is_featured && (
          <Star className="absolute top-2 right-2 w-4 h-4 fill-gold text-gold" />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="font-sans font-medium text-sm text-bone truncate">
          {product.name}
        </p>
        <p className="font-sans text-xs text-taupe uppercase tracking-wide mt-0.5">
          {product.category}
        </p>

        {/* Price */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-bone text-sm">₹{product.price}</span>
          {product.compare_at_price && (
            <span className="text-taupe text-xs line-through">
              ₹{product.compare_at_price}
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-taupe hover:text-bone transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product);
            }}
            className="p-1.5 text-terracotta hover:text-terracotta/80 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
