"use client"

import { useState } from "react"
import { Product } from "@/types"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, Truck, Info, ChevronRight } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useWishlistStore } from "@/store/wishlistStore"
import ProductCard from "./ProductCard"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function ProductDetailClient({
  product,
  relatedProducts,
}: {
  product: Product
  relatedProducts: Product[]
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<
    Record<string, any> | null
  >(product.variants?.[0] || null)

  const addItemToCart = useCartStore((state) => state.addItem)
  const {
    addItem: addWishlist,
    removeItem: removeWishlist,
    isInWishlist,
  } = useWishlistStore()

  const isWished = isInWishlist(product.id)

  const handleAddToCart = () => {
    addItemToCart({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: product.images[0] || "",
      variant: selectedVariant,
      quantity: 1,
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 pt-28">
      {/* Breadcrumb */}
      <div className="flex items-center font-sans text-micro uppercase tracking-widest text-taupe mb-12">
        <a
          href="/shop"
          className="hover:text-bone transition-colors duration-[400ms]"
        >
          Shop
        </a>
        <ChevronRight className="w-3 h-3 mx-3 text-taupe/50" />
        <a
          href={`/shop?category=${product.category}`}
          className="hover:text-bone transition-colors duration-[400ms]"
        >
          {product.category}
        </a>
        <ChevronRight className="w-3 h-3 mx-3 text-taupe/50" />
        <span className="text-bone">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 mb-32">
        {/* ━━━ LEFT: Image Gallery ━━━ */}
        <div className="flex flex-col gap-4">
          {/* Main Image */}
          <div className="relative aspect-[4/5] overflow-hidden bg-surface">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: PSY_EASE }}
                src={
                  product.images[activeImageIndex] ||
                  "https://via.placeholder.com/800x1000?text=No+Image"
                }
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`flex-shrink-0 w-16 aspect-square overflow-hidden transition-all duration-[400ms] cursor-pointer ${
                    activeImageIndex === idx
                      ? "opacity-100 border border-bone"
                      : "opacity-40 hover:opacity-70 border border-transparent"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ━━━ RIGHT: Product Info (sticky) ━━━ */}
        <div className="lg:sticky lg:top-24 lg:self-start flex flex-col">
          {/* Category label */}
          <span className="font-sans text-micro uppercase tracking-widest text-taupe mb-4">
            {product.category}
          </span>

          {/* Name */}
          <h1 className="font-display font-light text-display-lg text-bone mb-4 leading-tight">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-end gap-4 mb-4">
            <span className="font-sans text-body-lg text-bone">
              ₹{product.price}
            </span>
            {product.compare_at_price && (
              <span className="font-sans text-caption text-taupe line-through mb-0.5">
                ₹{product.compare_at_price}
              </span>
            )}
          </div>

          {/* Material */}
          {product.material && (
            <p className="font-sans text-caption text-taupe mb-6">
              {product.material}
            </p>
          )}

          {/* Divider */}
          <div className="h-[1px] bg-taupe/20 mb-6" />

          {/* Short description */}
          <p className="font-sans text-body text-taupe leading-relaxed mb-8">
            {product.description_short}
          </p>

          {/* Variant selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-8">
              <span className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                Select Option
              </span>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 font-sans text-caption uppercase transition-all duration-[400ms] border cursor-pointer ${
                      JSON.stringify(selectedVariant) === JSON.stringify(v)
                        ? "bg-bone text-ink border-bone"
                        : "bg-transparent border-taupe/30 text-bone hover:border-bone"
                    }`}
                  >
                    {Object.values(v).join(" — ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart — primary button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.stock_status}
            className="w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-4 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] disabled:opacity-50 disabled:cursor-not-allowed mb-3 cursor-pointer"
          >
            {product.stock_status ? "Add to Cart" : "Currently Unavailable"}
          </button>

          {/* Save to Wishlist — ghost button */}
          <button
            onClick={() =>
              isWished ? removeWishlist(product.id) : addWishlist(product)
            }
            className={`w-full border uppercase tracking-widest text-caption py-4 rounded-[2px] transition-all duration-[400ms] flex items-center justify-center gap-2 mb-8 cursor-pointer ${
              isWished
                ? "border-bone text-bone"
                : "border-taupe/30 text-taupe hover:border-bone hover:text-bone"
            }`}
          >
            <Heart
              className={`w-4 h-4 ${isWished ? "fill-current" : ""}`}
            />
            {isWished ? "Saved" : "Save to Wishlist"}
          </button>

          {/* Divider */}
          <div className="h-[1px] bg-taupe/20 mb-6" />

          {/* Full description — collapsible */}
          {product.description_full && (
            <div className="mb-6">
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="font-sans text-caption uppercase tracking-widest text-bone mb-3 block cursor-pointer"
              >
                {showFullDesc ? "Hide Details" : "View Details"}
              </button>
              <AnimatePresence>
                {showFullDesc && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: PSY_EASE }}
                    className="overflow-hidden"
                  >
                    <div
                      className="font-sans text-body text-taupe leading-relaxed prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: product.description_full,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Shipping note */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 font-sans text-caption text-taupe">
              <Truck className="w-4 h-4 text-taupe/60" />
              <span>
                Ships free on orders over ₹999. Dispatch within 48 hours.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ RELATED PRODUCTS ━━━ */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-taupe/20 pt-24">
          <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-12">
            You Might Also Like
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p as any} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
