"use client";

import { Product } from "@/types";
import { Star, Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const ProductVisual = dynamic(() => import("@/components/3d/ProductVisual"), {
  ssr: false,
});

interface AdminProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function categoryToVisualType(
  category: string
): "ring" | "necklace" | "earring" | "bracelet" | "cuff" | "default" {
  const map: Record<string, "ring" | "necklace" | "earring" | "bracelet" | "cuff"> = {
    Rings: "ring",
    Necklaces: "necklace",
    Earrings: "earring",
    Bracelets: "bracelet",
    Cuffs: "cuff",
  };
  return map[category] || "default";
}

export default function AdminProductCard({
  product,
  onEdit,
  onDelete,
}: AdminProductCardProps) {
  const isLive = product.stock_status && !product.is_deleted;

  return (
    <div className="group bg-surface border border-borderDark rounded overflow-hidden hover:border-[#3a3a3a] transition-all hover:-translate-y-1 hover:shadow-lg">
      {/* Image / 3D placeholder — 16:9 */}
      <div className="relative aspect-video overflow-hidden bg-surfaceLighter">
        <ProductVisual
          imageUrls={product.images || []}
          category={categoryToVisualType(product.category)}
          className="w-full h-full"
        />

        {/* Featured star */}
        {product.is_featured && (
          <div className="absolute top-2 right-2 z-10">
            <Star className="w-5 h-5 fill-neon-green text-neon-green" />
          </div>
        )}

        {/* Action buttons — visible on hover */}
        <div className="absolute bottom-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(product)}
            className="p-2 bg-surfaceLighter/90 backdrop-blur rounded hover:bg-borderDark transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-2 bg-danger/80 rounded hover:bg-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm text-primaryText truncate">
            {product.name}
          </h3>
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${
              isLive
                ? "bg-neon-green/10 text-neon-green"
                : "bg-borderDark text-mutedText"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? "bg-neon-green" : "bg-mutedText"
              }`}
            />
            {isLive ? "Live" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-primaryText">
            ₹{product.price}
          </span>
          {product.compare_at_price && (
            <span className="font-mono text-xs text-mutedText line-through">
              ₹{product.compare_at_price}
            </span>
          )}
        </div>

        <span className="inline-block text-[10px] uppercase font-mono tracking-wider bg-surfaceLighter text-mutedText px-2 py-0.5 rounded">
          {product.category}
        </span>
      </div>
    </div>
  );
}
