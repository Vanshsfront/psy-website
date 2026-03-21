"use client"

import { Product } from "@/types"
import Link from "next/link"
import { Heart } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useWishlistStore } from "@/store/wishlistStore"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function ProductCard({ product }: { product: Product }) {
  const [mounted, setMounted] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const addItemToCart = useCartStore((state) => state.addItem)
  const {
    addItem: addWishlist,
    removeItem: removeWishlist,
    isInWishlist,
  } = useWishlistStore()

  useEffect(() => setMounted(true), [])

  const primaryImage =
    product.images?.[0] ||
    "https://via.placeholder.com/400x500?text=No+Image"
  const hoverImage = product.images?.[1] || primaryImage

  const isWished = mounted ? isInWishlist(product.id) : false

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isWished) removeWishlist(product.id)
    else addWishlist(product)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItemToCart({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: primaryImage,
      variant: product.variants?.[0] || null,
      quantity: 1,
    })
  }

  return (
    <motion.div
      className="group flex flex-col relative cursor-pointer"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: PSY_EASE }}
    >
      <Link href={`/shop/${product.slug}`} className="flex-grow flex flex-col">
        {/* Image Container — consistent 4:5 aspect ratio */}
        <div className="relative aspect-[4/5] overflow-hidden mb-4 bg-surfaceLighter rounded-lg group-hover:shadow-[0_0_30px_rgba(200,200,200,0.05)] transition-all duration-300">
          {/* Skeleton Loader while image is loading */}
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-borderDark animate-pulse" />
          )}

          <img
            src={primaryImage}
            alt={product.name}
            onLoad={() => setIsImageLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] group-hover:opacity-0 ${isImageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}
          />
          <img
            src={hoverImage}
            alt={`${product.name} alternate`}
            className="absolute inset-0 w-full h-full object-cover opacity-0 scale-[1.05] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:scale-100"
          />

          {/* Subtle border glow on hover */}
          <div className="absolute inset-0 border border-transparent group-hover:border-bone/10 transition-colors duration-300 pointer-events-none" />

          {/* Wishlist — explicitly visible to encourage usage */}
          <button
            onClick={handleWishlist}
            className={`absolute top-4 right-4 z-20 transition-all duration-300 p-2 rounded-full cursor-pointer hover:bg-black/20 hover:backdrop-blur-md hover:scale-110 active:scale-95 ${
              isWished 
                ? "text-psy-green opacity-100 drop-shadow-[0_0_8px_rgba(var(--psy-green-rgb),0.5)]" 
                : "text-bone/40 opacity-70 group-hover:opacity-100 hover:text-bone/90"
            }`}
          >
            <Heart
              className={`w-5 h-5 transition-all duration-300 ${
                isWished ? "fill-current" : ""
              }`}
            />
          </button>

          {/* Limited badge */}
          {product.category === "Limited Edition" && (
            <span className="absolute top-4 left-4 font-sans text-micro uppercase tracking-widest text-gold bg-ink/60 px-3 py-1 backdrop-blur-sm">
              Limited
            </span>
          )}

          {/* Quick add overlay — appears at bottom on hover */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent px-4 py-3 opacity-0 group-hover:opacity-100 transition-all duration-[400ms] translate-y-2 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              disabled={!product.stock_status}
              className="w-full text-center cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="text-cta font-sans uppercase tracking-widest text-micro text-bone">
                {product.stock_status ? "Add to Cart →" : "Unavailable"}
              </span>
            </button>
          </div>
        </div>

        {/* Content — left-aligned */}
        <div className="flex flex-col">
          <h3 className="font-display text-body-lg text-bone mb-1 leading-tight group-hover:text-psy-green transition-colors duration-300">
            {product.name}
          </h3>
          {product.material && (
            <p className="font-sans text-caption text-taupe mb-1">
              {product.material}
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="font-sans text-body text-bone">
              ₹{product.price}
            </span>
            {product.compare_at_price && (
              <span className="font-sans text-caption text-taupe line-through">
                ₹{product.compare_at_price}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
