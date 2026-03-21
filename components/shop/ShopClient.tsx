"use client"

import Link from "next/link"
import TextReveal from "@/components/animations/TextReveal"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import StaggeredGrid from "@/components/animations/StaggeredGrid"
import HoverLift from "@/components/animations/HoverLift"
import HeroBackground from "@/components/animations/HeroBackground"
import ProductCard from "@/components/shop/ProductCard"
import { useScroll, useTransform, motion } from "framer-motion"
import { useRef } from "react"
import type { Product } from "@/types"

interface ShopClientProps {
  products: Product[]
  categories: string[]
  activeCategory: string
}

export default function ShopClient({
  products,
  categories,
  activeCategory,
}: ShopClientProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])

  return (
    <main className="min-h-screen bg-ink pb-24 relative" ref={containerRef}>
      {/* ━━━ HERO ━━━ */}
      <section className="relative w-full min-h-screen flex items-center px-6 pt-20 overflow-hidden">
        <HeroBackground />
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center w-full relative z-10">
          <div>
            <FadeInOnScroll direction="none" delay={0.2}>
              <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-8">
                PSY Shop
              </span>
            </FadeInOnScroll>

            <TextReveal
              text={["PSY Shop"]}
              as="h1"
              className="font-display font-light text-display-2xl text-bone leading-[0.95] mb-6"
              delay={0.3}
            />

            <FadeInOnScroll direction="none" delay={0.6}>
              <p className="font-display italic text-taupe text-body-lg mb-12 max-w-md">
                — a collection born from ritual.
              </p>
            </FadeInOnScroll>

            <FadeInOnScroll direction="up" delay={0.8}>
              <Link
                href="#collection"
                className="text-cta font-sans uppercase tracking-widest text-caption text-bone"
              >
                Browse Shop →
              </Link>
            </FadeInOnScroll>
          </div>
          <div className="flex items-center justify-center">
            {(() => {
              const featured = products.find(p => p.is_featured)
              if (featured) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                    className="w-full max-w-md aspect-[4/5] relative overflow-hidden group cursor-pointer rounded-3xl"
                  >
                    <motion.div style={{ y, height: "120%", top: "-10%", position: "absolute", width: "100%", left: 0 }}>
                      <img
                        src={featured.images[0]}
                        alt={featured.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                      />
                    </motion.div>
                    
                    {/* Vignette effect */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute bottom-6 left-6 right-6">
                        <span className="font-display text-xl text-bone block">{featured.name}</span>
                        <span className="font-sans text-caption text-taupe mt-1 block">₹{featured.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              }
              return (
                <div className="w-full max-w-md aspect-[4/5] bg-surface flex items-center justify-center border border-taupe/10 rounded-3xl relative overflow-hidden">
                  <span className="font-display italic text-taupe text-body-lg">
                    Featured piece
                  </span>
                </div>
              )
            })()}
          </div>
        </div>
      </section>

      {/* ━━━ CATEGORY NAVIGATION ━━━ */}
      <section className="py-16 px-6" id="collection">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8 mb-16">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/shop${cat === "All" ? "" : `?category=${encodeURIComponent(cat)}`}`}
                className={`relative font-sans text-caption uppercase tracking-widest transition-colors duration-[400ms] pb-1 ${
                  activeCategory === cat
                    ? "text-bone after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-bone"
                    : "text-taupe hover:text-bone"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-taupe/20 mb-16" />
        </div>
      </section>

      {/* ━━━ PRODUCT GRID ━━━ */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto">
          {products && products.length > 0 ? (
            <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16">
              {products.map((p) => (
                <HoverLift key={p.id} lift={-6}>
                  <ProductCard product={p} />
                </HoverLift>
              ))}
            </StaggeredGrid>
          ) : (
            <div className="text-center py-32">
              <p className="font-display italic text-taupe text-body-lg">
                Nothing here yet.
              </p>
              <p className="font-sans text-caption text-taupe/60 mt-2">
                The collection is growing.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
