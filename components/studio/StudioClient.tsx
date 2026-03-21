"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import TextReveal from "@/components/animations/TextReveal"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import StaggeredGrid from "@/components/animations/StaggeredGrid"
import MagneticHover from "@/components/animations/MagneticHover"
import LineReveal from "@/components/animations/LineReveal"
import Accordion from "@/components/studio/Accordion"
import BookingForm from "@/components/studio/BookingForm"
import HeroBackground from "@/components/animations/HeroBackground"
import { scrollToSection } from "@/lib/smoothScroll"
import type { Artist, CustomStyle, PortfolioItem } from "@/types"

interface StudioClientProps {
  artists: Artist[]
  styles: CustomStyle[]
  portfolio: (PortfolioItem & { artists?: { name: string } | null })[]
}

export default function StudioClient({ artists, styles, portfolio }: StudioClientProps) {
  return (
    <main className="w-full">
      {/* ━━━ 1. HERO ━━━ */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center bg-ink px-6 overflow-hidden">
        <HeroBackground />
        
        <FadeInOnScroll direction="none" delay={0.2} className="relative z-10 w-full flex justify-center">
          <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro mb-10 block text-center">
            PSY Tattoos — Est. 2024 — Mumbai
          </span>
        </FadeInOnScroll>

        <TextReveal
          text={["Where the mind", "meets the skin."]}
          as="h1"
          className="font-display font-light text-display-2xl text-bone leading-[0.95] text-center mb-0"
          delay={0.3}
        />

        {/* Thin rule */}
        <LineReveal width="80px" delay={0.5} className="mt-8 mb-8" />

        <FadeInOnScroll direction="none" delay={0.7}>
          <p className="font-sans text-body text-taupe text-center max-w-sm leading-relaxed">
            Custom tattoo artistry. Permanent work made with intention.
          </p>
        </FadeInOnScroll>

        <FadeInOnScroll direction="up" delay={0.9}>
          <div className="flex items-center gap-6 mt-10">
            <MagneticHover strength={0.4}>
              <button
                onClick={() => scrollToSection("gallery")}
                className="text-cta font-sans uppercase tracking-widest text-caption text-bone cursor-pointer btn-press"
              >
                Explore Work
              </button>
            </MagneticHover>
            <MagneticHover strength={0.4}>
              <motion.button
                onClick={() => scrollToSection("book")}
                className="border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-3 px-8 hover:bg-psy-green hover:text-ink transition-all duration-[400ms] cursor-pointer btn-press"
                whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(59, 163, 124, 0.25)' }}
                whileTap={{ scale: 0.97 }}
              >
                Book Now
              </motion.button>
            </MagneticHover>
          </div>
        </FadeInOnScroll>

        {/* Scroll down indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-sans text-micro text-taupe uppercase tracking-widest">scroll</span>
          <svg
            className="w-4 h-4 text-taupe animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
      </section>

      {/* ━━━ 2. PHILOSOPHY STRIP ━━━ */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <FadeInOnScroll direction="left" delay={0.1}>
            <div>
              <span className="font-display font-light text-[10rem] leading-none text-bone/[0.08] select-none block">
                07
              </span>
              <span className="font-sans text-caption text-taupe mt-2 block">
                years of practice
              </span>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll direction="right" delay={0.2}>
            <div>
              <h2 className="font-display text-display-lg text-bone leading-tight">
                Ink is never just ink.
              </h2>
              <p className="font-sans text-body text-taupe leading-relaxed mt-4">
                Every mark we make is deliberate. We believe a tattoo is not decoration — it is 
                a dialogue between intention and skin. No flash walls, no rush. Each session 
                begins with listening. Every line placed with purpose.
              </p>
              <Link
                href="/studio/gallery"
                className="text-cta font-sans uppercase tracking-widest text-caption text-bone mt-6 inline-block"
              >
                Our Story →
              </Link>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* ━━━ 3. SELECTED WORK ━━━ */}
      <section className="py-24 px-6" id="gallery">
        <div className="max-w-7xl mx-auto">
          {/* Section label row */}
          <div className="flex items-center mb-12">
            <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
              Selected Work
            </span>
            <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            <Link
              href="/studio/gallery"
              className="text-cta font-sans uppercase tracking-widest text-micro text-bone shrink-0"
            >
              View All →
            </Link>
          </div>

          {/* Asymmetric grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Cell 1: large landscape */}
            <FadeInOnScroll direction="up" delay={0}>
              <div className="relative overflow-hidden aspect-[9/16] bg-[#1a1a1a] group">
                {portfolio[0] ? (
                  <>
                    <Image
                      src={portfolio[0].image_url}
                      alt={portfolio[0].description || "Tattoo work"}
                      fill
                      className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4">
                        <span className="font-sans text-caption text-bone block">
                          {portfolio[0].artists?.name || "Studio Artist"}
                        </span>
                        <span className="font-sans text-micro text-taupe">
                          {portfolio[0].style_tag}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </FadeInOnScroll>

            {/* Cell 2: tall portrait */}
            <FadeInOnScroll direction="up" delay={0.1}>
              <div className="relative overflow-hidden aspect-[9/16] bg-[#1a1a1a] group">
                {portfolio[1] ? (
                  <>
                    <Image
                      src={portfolio[1].image_url}
                      alt={portfolio[1].description || "Tattoo work"}
                      fill
                      className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4">
                        <span className="font-sans text-caption text-bone block">
                          {portfolio[1].artists?.name || "Studio Artist"}
                        </span>
                        <span className="font-sans text-micro text-taupe">
                          {portfolio[1].style_tag}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </FadeInOnScroll>

            {/* Cell 3: medium square */}
            <FadeInOnScroll direction="up" delay={0.15}>
              <div className="relative overflow-hidden aspect-[9/16] bg-[#1a1a1a] group">
                {portfolio[2] ? (
                  <>
                    <Image
                      src={portfolio[2].image_url}
                      alt={portfolio[2].description || "Tattoo work"}
                      fill
                      className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4">
                        <span className="font-sans text-caption text-bone block">
                          {portfolio[2].artists?.name || "Studio Artist"}
                        </span>
                        <span className="font-sans text-micro text-taupe">
                          {portfolio[2].style_tag}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </FadeInOnScroll>

            {/* Cell 4: medium square */}
            <FadeInOnScroll direction="up" delay={0.2}>
              <div className="relative overflow-hidden aspect-[9/16] bg-[#1a1a1a] group">
                {portfolio[3] ? (
                  <>
                    <Image
                      src={portfolio[3].image_url}
                      alt={portfolio[3].description || "Tattoo work"}
                      fill
                      className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4">
                        <span className="font-sans text-caption text-bone block">
                          {portfolio[3].artists?.name || "Studio Artist"}
                        </span>
                        <span className="font-sans text-micro text-taupe">
                          {portfolio[3].style_tag}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* ━━━ 4. THE ARTISTS ━━━ */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-12">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                The Artists
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
          </FadeInOnScroll>

          {artists.length > 0 ? (
            <StaggeredGrid className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {artists.map((artist) => (
                <div key={artist.id} className="group cursor-pointer">
                  <div className="aspect-[9/16] overflow-hidden mb-4 bg-[#1a1a1a] relative">
                    {artist.profile_photo_url ? (
                      <img
                        src={artist.profile_photo_url}
                        alt={artist.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.04] transition-all duration-500 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-taupe font-sans text-caption">
                        No Photo
                      </div>
                    )}
                    {/* Hover overlay with name */}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4">
                        <span className="font-sans text-caption text-bone">
                          {artist.speciality}
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-display text-xl text-bone">
                    {artist.name}
                  </h3>
                  <p className="font-sans text-caption text-taupe uppercase tracking-wide mt-1">
                    {artist.speciality}
                  </p>
                  <Link
                    href={`/studio/artists/${artist.slug}`}
                    className="text-cta font-sans uppercase tracking-widest text-micro text-psy-green mt-3 inline-block"
                  >
                    View Work →
                  </Link>
                </div>
              ))}
            </StaggeredGrid>
          ) : (
            <div className="w-full text-center py-24">
              <p className="font-display italic text-taupe text-body-lg">
                More coming soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ━━━ 5. STYLES & PRICING ━━━ */}
      <section className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-12">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                What We Do
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
          </FadeInOnScroll>

          <div className="max-w-3xl mx-auto">
            <Accordion styles={styles} />
          </div>
        </div>
      </section>

      {/* ━━━ 6. BOOKING FORM ━━━ */}
      <section className="py-32 px-6" id="book">
        <div className="max-w-2xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-12">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                Book a Session
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll direction="up" delay={0.1}>
            <h2 className="font-display font-light text-display-xl text-bone">
              Start Your Journey
            </h2>
            <p className="font-display italic text-taupe text-xl mt-2 mb-12">
              — every tattoo begins with a conversation.
            </p>
          </FadeInOnScroll>

          <FadeInOnScroll direction="up" delay={0.2}>
            <BookingForm artists={artists} styles={styles} />
          </FadeInOnScroll>
        </div>
      </section>
    </main>
  )
}
