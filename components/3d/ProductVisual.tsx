"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import JewelryPlaceholderCSS from "./JewelryPlaceholderCSS";

type Category =
  | "ring"
  | "necklace"
  | "earring"
  | "bracelet"
  | "cuff"
  | "default";

interface ProductVisualProps {
  imageUrls: string[];
  category: Category;
  interactive?: boolean;
  className?: string;
  showSecondOnHover?: boolean;
}

// Dynamic import with SSR disabled for the Three.js component
const JewelryPlaceholder3D = dynamic(() => import("./JewelryPlaceholder3D"), {
  ssr: false,
  loading: () => null,
});

export default function ProductVisual({
  imageUrls,
  category,
  interactive = false,
  className = "",
  showSecondOnHover = false,
}: ProductVisualProps) {
  const [hovered, setHovered] = useState(false);

  if (imageUrls.length > 0) {
    const hasSecond = showSecondOnHover && imageUrls.length > 1;
    return (
      <div
        className={`relative aspect-square overflow-hidden bg-surface ${className}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Primary image */}
        <Image
          src={imageUrls[0]}
          alt="Product"
          fill
          className={`object-cover transition-opacity duration-500 ${
            hasSecond && hovered ? "opacity-0" : "opacity-100"
          }`}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {/* Second image on hover */}
        {hasSecond && (
          <Image
            src={imageUrls[1]}
            alt="Product alternate"
            fill
            className={`object-cover transition-opacity duration-500 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
      </div>
    );
  }

  // No images — show 3D placeholder
  return (
    <div
      className={`relative aspect-square overflow-hidden bg-[#0e0e0e] flex items-center justify-center ${className}`}
    >
      <Suspense
        fallback={
          <JewelryPlaceholderCSS category={category} size={80} />
        }
      >
        <JewelryPlaceholder3D
          category={category}
          interactive={interactive}
          className="w-full h-full"
        />
      </Suspense>
    </div>
  );
}
