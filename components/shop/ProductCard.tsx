"use client"

import { Product } from "@/types"
import Link from "next/link"
import { Heart, Plus, Minus } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useWishlistStore } from "@/store/wishlistStore"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function ProductCard({ product }: { product: Product }) {
  const [mounted, setMounted] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const { addItem: addItemToCart, removeItem, updateQuantity, items } = useCartStore()
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

  // Get current quantity in cart for this product (first variant)
  const defaultVariant = product.variants?.[0] || null
  const cartItem = mounted
    ? items.find(
        (i) =>
          i.product_id === product.id &&
          JSON.stringify(i.variant) === JSON.stringify(defaultVariant)
      )
    : undefined
  const cartQty = cartItem?.quantity || 0

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isWished) removeWishlist(product.id)
    else addWishlist(product)
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartQty === 0) {
      addItemToCart({
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image_url: primaryImage,
        variant: defaultVariant,
        quantity: 1,
      })
    } else {
      updateQuantity(product.id, defaultVariant, cartQty + 1)
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartQty <= 1) {
      removeItem(product.id, defaultVariant)
    } else {
      updateQuantity(product.id, defaultVariant, cartQty - 1)
    }
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

          {/* Low stock badge */}
          {product.stock_status && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
            <span className="absolute top-4 left-4 font-sans text-micro uppercase tracking-widest text-terracotta bg-ink/60 px-3 py-1 backdrop-blur-sm">
              Only {product.stock_quantity} left
            </span>
          )}

          {/* Quick add overlay — +/− stepper */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent px-4 py-4 opacity-60 group-hover:opacity-100 transition-all duration-[400ms] translate-y-0">
            {!product.stock_status ? (
              <span className="block text-center font-sans uppercase tracking-widest text-micro text-taupe/60">
                Unavailable
              </span>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <AnimatePresence mode="wait">
                  {cartQty > 0 ? (
                    <motion.div
                      key="stepper"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-4"
                    >
                      <button
                        onClick={handleDecrement}
                        className="w-8 h-8 rounded-full border border-bone/30 flex items-center justify-center text-bone hover:bg-bone/10 transition-all duration-300 cursor-pointer active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <motion.span
                        key={cartQty}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-sans text-caption text-bone w-4 text-center"
                      >
                        {cartQty}
                      </motion.span>
                      <button
                        onClick={handleIncrement}
                        className="w-8 h-8 rounded-full border border-bone/30 flex items-center justify-center text-bone hover:bg-bone/10 transition-all duration-300 cursor-pointer active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="add"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      onClick={handleIncrement}
                      className="w-9 h-9 rounded-full bg-bone/20 backdrop-blur-sm border border-bone/50 flex items-center justify-center text-bone hover:bg-bone/30 hover:border-bone/70 transition-all duration-300 cursor-pointer active:scale-90 shadow-[0_0_10px_rgba(245,243,239,0.1)]"
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}
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
