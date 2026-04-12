"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import TextReveal from "@/components/animations/TextReveal"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function Home() {
  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null)

  return (
    <main className="relative flex flex-col md:flex-row h-screen w-full overflow-hidden bg-ink">
      {/* Vertical Divider — Desktop */}
      <div
        className="hidden md:block absolute top-0 bottom-0 z-20 w-[1px] bg-taupe/20 pointer-events-none transition-all duration-[600ms]"
        style={{
          left: hoveredSide === "left" ? "calc(50% - 2px)" : hoveredSide === "right" ? "calc(50% + 2px)" : "50%",
        }}
      />

      {/* Horizontal Divider — Mobile */}
      <div className="md:hidden absolute left-0 right-0 top-1/2 z-20 h-[1px] bg-taupe/20 pointer-events-none" />

      {/* LEFT SIDE — PSY TATTOOS */}
      <Link
        href="/studio"
        className="relative flex items-center justify-center h-[50vh] md:h-screen md:w-1/2 cursor-pointer group overflow-hidden block"
        onMouseEnter={() => setHoveredSide("left")}
        onMouseLeave={() => setHoveredSide(null)}
      >
        {/* Background image */}
        <Image
          src="https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=1400&q=80&auto=format&fit=crop"
          alt="PSY Tattoos Studio"
          fill
          className="object-cover opacity-40"
          priority
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/40 to-ink/80" />

        {/* Hover glow + overlay */}
        <div
          className={`absolute inset-0 transition-all duration-[600ms] z-[1] ${
            hoveredSide === "left" ? "bg-bone/[0.03]" : "bg-transparent"
          }`}
        />
        <div
          className={`absolute inset-0 z-[1] transition-opacity duration-500 ${
            hoveredSide === "left" ? "opacity-100" : "opacity-0"
          }`}
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(200,255,200,0.04) 0%, transparent 60%)" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <FadeInOnScroll direction="none" delay={0.3}>
            <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro mb-8 block">
              PSY Tattoos — Mumbai
            </span>
          </FadeInOnScroll>

          <TextReveal
            text={["PSY", "Tattoos"]}
            as="h1"
            className="font-display font-light text-display-2xl text-bone leading-[0.9] mb-6"
            delay={0.4}
          />

          {/* Thin horizontal rule */}
          <motion.div
            className="w-[60px] h-[1px] bg-taupe/40 mb-6"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.7, ease: PSY_EASE }}
          />

          <FadeInOnScroll direction="none" delay={0.7}>
            <p className="font-display italic text-taupe text-body-lg mb-10">
              — where the mind meets the skin
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll direction="up" delay={0.9}>
            <span className="text-cta font-sans uppercase tracking-widest text-caption text-bone">
              Explore Studio →
            </span>
          </FadeInOnScroll>
        </div>
      </Link>

      {/* RIGHT SIDE — PSY SHOP */}
      <Link
        href="/shop"
        className="relative flex items-center justify-center h-[50vh] md:h-screen md:w-1/2 cursor-pointer group overflow-hidden block"
        onMouseEnter={() => setHoveredSide("right")}
        onMouseLeave={() => setHoveredSide(null)}
      >
        {/* Background image */}
        <Image
          src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&q=80&auto=format&fit=crop"
          alt="PSY Shop"
          fill
          className="object-cover opacity-40"
          priority
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/40 to-ink/80" />

        {/* Hover glow + overlay */}
        <div
          className={`absolute inset-0 transition-all duration-[600ms] z-[1] ${
            hoveredSide === "right" ? "bg-bone/[0.03]" : "bg-transparent"
          }`}
        />
        <div
          className={`absolute inset-0 z-[1] transition-opacity duration-500 ${
            hoveredSide === "right" ? "opacity-100" : "opacity-0"
          }`}
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,220,150,0.04) 0%, transparent 60%)" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <FadeInOnScroll direction="none" delay={0.5}>
            <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro mb-8 block">
              Jewelry — PSY Shop
            </span>
          </FadeInOnScroll>

          <TextReveal
            text={["PSY", "Shop"]}
            as="h1"
            className="font-display font-light text-display-2xl text-bone leading-[0.9] mb-6"
            delay={0.6}
          />

          {/* Thin horizontal rule */}
          <motion.div
            className="w-[60px] h-[1px] bg-taupe/40 mb-6"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.7, ease: PSY_EASE }}
          />

          <FadeInOnScroll direction="none" delay={0.9}>
            <p className="font-display italic text-gold text-body-lg mb-10">
              — wear the ritual
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll direction="up" delay={1.1}>
            <span className="text-cta font-sans uppercase tracking-widest text-caption text-bone">
              View Shop →
            </span>
          </FadeInOnScroll>
        </div>
      </Link>
    </main>
  )
}
