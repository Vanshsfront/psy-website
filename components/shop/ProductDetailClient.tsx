"use client"

import { useState, useEffect, useMemo } from "react"
import { Product, VariantGroup, VariantValue } from "@/types"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, Truck, Info, ChevronRight, Plus, Minus } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useWishlistStore } from "@/store/wishlistStore"
import ProductCard from "./ProductCard"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

function normalizeVariants(raw: unknown): VariantGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const first = raw[0] as Record<string, unknown>
  if (first && typeof first === "object" && "group" in first && "values" in first) {
    return raw as VariantGroup[]
  }
  const values: VariantValue[] = (raw as Record<string, unknown>[]).map((v) => {
    const label = (v.size ?? v.label ?? Object.values(v)[0]) as string
    return { label: String(label ?? ""), priceOverride: null }
  })
  return [{ group: "Option", values }]
}

export default function ProductDetailClient({
  product,
  relatedProducts,
}: {
  product: Product
  relatedProducts: Product[]
}) {
  const variantGroups = useMemo(
    () => normalizeVariants(product.variants as unknown),
    [product.variants]
  )

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [selectedValues, setSelectedValues] = useState<Record<string, VariantValue>>(
    () =>
      Object.fromEntries(
        variantGroups
          .filter((g) => g.values.length > 0)
          .map((g) => [g.group, g.values[0]])
      )
  )

  // Variant image shown in the gallery (overrides product.images when set)
  const [variantImage, setVariantImage] = useState<string | null>(() => {
    for (const g of variantGroups) {
      const v = g.values[0]
      if (v?.imageUrl) return v.imageUrl
    }
    return null
  })

  const selectedVariant = useMemo(() => {
    if (Object.keys(selectedValues).length === 0) return null
    const out: Record<string, string> = {}
    for (const [group, val] of Object.entries(selectedValues)) {
      out[group] = val.label
    }
    return out
  }, [selectedValues])

  const handleSelectValue = (group: string, value: VariantValue) => {
    setSelectedValues((prev) => ({ ...prev, [group]: value }))
    if (value.imageUrl) {
      setVariantImage(value.imageUrl)
    }
  }

  const { addItem: addItemToCart, removeItem, updateQuantity, items } = useCartStore()
  const {
    addItem: addWishlist,
    removeItem: removeWishlist,
    isInWishlist,
  } = useWishlistStore()

  const isWished = isInWishlist(product.id)

  // Get current quantity in cart for this product + selected variant
  const cartItem = items.find(
    (i) =>
      i.product_id === product.id &&
      JSON.stringify(i.variant) === JSON.stringify(selectedVariant)
  )
  const cartQty = cartItem?.quantity || 0

  const handleIncrement = () => {
    if (cartQty === 0) {
      addItemToCart({
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image_url: product.images[0] || "",
        variant: selectedVariant,
        quantity: 1,
      })
    } else {
      updateQuantity(product.id, selectedVariant, cartQty + 1)
    }
  }

  const handleDecrement = () => {
    if (cartQty <= 1) {
      removeItem(product.id, selectedVariant)
    } else {
      updateQuantity(product.id, selectedVariant, cartQty - 1)
    }
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
                key={variantImage ?? `idx-${activeImageIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: PSY_EASE }}
                src={
                  variantImage ||
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
              {product.images.map((img, idx) => {
                const isActive = !variantImage && activeImageIndex === idx
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIndex(idx)
                      setVariantImage(null)
                    }}
                    className={`flex-shrink-0 w-16 aspect-square overflow-hidden transition-all duration-[400ms] cursor-pointer ${
                      isActive
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
                )
              })}
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
          {variantGroups.map((g) => (
            <div key={g.group} className="mb-8">
              <span className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                {g.group || "Select Option"}
              </span>
              <div className="flex flex-wrap gap-3">
                {g.values.map((v, i) => {
                  const isSelected = selectedValues[g.group]?.label === v.label
                  return (
                    <button
                      key={`${v.label}-${i}`}
                      onClick={() => handleSelectValue(g.group, v)}
                      className={`flex items-center gap-2 px-3 py-2 font-sans text-caption uppercase transition-all duration-[400ms] border cursor-pointer ${
                        isSelected
                          ? "bg-bone text-ink border-bone"
                          : "bg-transparent border-taupe/30 text-bone hover:border-bone"
                      }`}
                    >
                      {v.imageUrl && (
                        <img
                          src={v.imageUrl}
                          alt={v.label}
                          className="w-6 h-6 object-cover rounded-[2px]"
                        />
                      )}
                      <span>{v.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Add to Cart — +/− stepper */}
          <div className="mb-3">
            <AnimatePresence mode="wait">
              {!product.stock_status ? (
                <motion.button
                  key="unavailable"
                  disabled
                  className="w-full border border-taupe/30 bg-transparent text-taupe uppercase tracking-widest text-caption py-4 rounded-[2px] opacity-50 cursor-not-allowed"
                >
                  Currently Unavailable
                </motion.button>
              ) : cartQty > 0 ? (
                <motion.div
                  key="stepper"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="w-full border border-psy-green rounded-[2px] flex items-center justify-between py-2 px-4"
                >
                  <button
                    onClick={handleDecrement}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-psy-green hover:bg-psy-green/10 transition-all duration-300 cursor-pointer active:scale-90"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <motion.span
                    key={cartQty}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="font-sans text-body-lg text-psy-green"
                  >
                    {cartQty}
                  </motion.span>
                  <button
                    onClick={handleIncrement}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-psy-green hover:bg-psy-green/10 transition-all duration-300 cursor-pointer active:scale-90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="add"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  onClick={handleIncrement}
                  className="w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-4 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Cart</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

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
