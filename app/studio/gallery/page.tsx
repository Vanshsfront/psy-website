"use client"

import { useEffect, useState } from "react"
import { PortfolioItem } from "@/types"
import { AnimatePresence, motion, useInView } from "framer-motion"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { useRef } from "react"
import { useGallery } from "@/hooks/useGallery"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ─── Animated grid item ─── */
function GalleryItem({ item, index, onClick }: { item: PortfolioItem; index: number; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: PSY_EASE, delay: (index % 6) * 0.06 }}
      className="relative group overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[9/16] overflow-hidden bg-[#1a1a1a]">
        <img
          src={item.image_url}
          alt={item.description || "Portfolio work"}
          className="w-full h-full object-cover transition-transform duration-600 ease-out group-hover:scale-[1.05]"
          loading="lazy"
        />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms]">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="font-sans text-caption text-bone block">
            {item.style_tag}
          </span>
          {item.description && (
            <span className="font-sans text-micro text-taupe block mt-0.5">
              {item.description}
            </span>
          )}
        </div>
      </div>

      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 border border-transparent group-hover:border-bone/10 transition-colors duration-300 pointer-events-none" />
    </motion.div>
  )
}

export default function GalleryPage() {
  const { items, isLoading } = useGallery()
  const [categories, setCategories] = useState<string[]>(["All"])
  const [activeCategory, setActiveCategory] = useState<string>("All")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Derive categories from items
  useEffect(() => {
    if (items.length > 0) {
      const tags = Array.from(
        new Set(
          items.map((i) => i.style_tag).filter(Boolean) as string[]
        )
      )
      setCategories(["All", ...tags])
    }
  }, [items])

  const filteredItems =
    activeCategory === "All"
      ? items
      : items.filter((i) => i.style_tag === activeCategory)

  const handlePrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1)
    }
  }

  const handleNext = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1)
    }
  }

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === "Escape") setLightboxIndex(null)
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "ArrowRight") handleNext()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [lightboxIndex, filteredItems.length])

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 min-h-screen pt-28">
      <div className="mb-16">
        <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-4">
          Portfolio
        </span>
        <h1 className="font-display font-light text-display-xl text-bone">
          Selected Work
        </h1>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-16">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 font-sans text-micro uppercase tracking-widest transition-all duration-[400ms] border rounded-[2px] cursor-pointer ${
              activeCategory === cat
                ? "bg-psy-green text-ink border-psy-green"
                : "bg-transparent border-taupe/30 text-taupe hover:border-bone hover:text-bone"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* STRUCTURED GRID — consistent 9:16 aspect ratio */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[9/16] bg-[#1a1a1a] animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, index) => (
            <GalleryItem
              key={item.id}
              item={item}
              index={index}
              onClick={() => setLightboxIndex(index)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24">
          <p className="font-display italic text-taupe text-body-lg">
            Nothing here yet.
          </p>
        </div>
      )}

      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: PSY_EASE }}
            className="fixed inset-0 z-[100] bg-ink/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 overflow-hidden"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              className="absolute top-6 right-6 text-bone hover:text-taupe transition-colors duration-[400ms] cursor-pointer z-10"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(null)
              }}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Previous */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-6 top-1/2 -translate-y-1/2 text-bone hover:text-taupe transition-colors duration-[400ms] cursor-pointer z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrev()
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {/* Next */}
            {lightboxIndex < filteredItems.length - 1 && (
              <button
                className="absolute right-6 top-1/2 -translate-y-1/2 text-bone hover:text-taupe transition-colors duration-[400ms] cursor-pointer z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}

            <motion.img
              key={lightboxIndex}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: PSY_EASE }}
              src={filteredItems[lightboxIndex].image_url}
              alt="Expanded view"
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Bottom bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
              <span className="font-sans text-caption text-bone block">
                {filteredItems[lightboxIndex].style_tag}
              </span>
              {filteredItems[lightboxIndex].description && (
                <span className="font-sans text-micro text-taupe">
                  {filteredItems[lightboxIndex].description}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
