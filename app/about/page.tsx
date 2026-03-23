"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import TextReveal from "@/components/animations/TextReveal"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import LineReveal from "@/components/animations/LineReveal"
import HeroBackground from "@/components/animations/HeroBackground"
import { Instagram, Facebook, MapPin, Clock, Mail } from "lucide-react"

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/psytattoosindia/reels/?hl=en",
  facebook: "https://www.facebook.com/214077871800038",
  maps: "https://maps.app.goo.gl/xbL7DeaD5FSL9tUg9",
}

export default function AboutPage() {
  return (
    <main className="w-full bg-ink">
      {/* ━━━ HERO ━━━ */}
      <section className="relative w-full min-h-[70vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        <HeroBackground />

        <FadeInOnScroll direction="none" delay={0.2} className="relative z-10 w-full flex justify-center">
          <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro mb-10 block text-center">
            Our Story
          </span>
        </FadeInOnScroll>

        <TextReveal
          text={["About", "PSY"]}
          as="h1"
          className="font-display font-light text-display-2xl text-bone leading-[0.95] text-center mb-0"
          delay={0.3}
        />

        <LineReveal width="80px" delay={0.5} className="mt-8 mb-8" />

        <FadeInOnScroll direction="none" delay={0.7}>
          <p className="font-sans text-body text-taupe text-center max-w-lg leading-relaxed">
            More than a studio — a philosophy etched in ink.
          </p>
        </FadeInOnScroll>
      </section>

      {/* ━━━ FOUNDER SECTION ━━━ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-16">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                The Founder
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Photo */}
            <FadeInOnScroll direction="left" delay={0.1}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl group bg-[#1a1a1a]">
                {/* Placeholder — replace with actual photo by putting it at /public/images/founder-yogesh.jpg */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c1c] to-[#111] text-taupe/30">
                  <svg className="w-20 h-20 mb-4 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                  <span className="font-sans text-micro uppercase tracking-widest">Founder Photo</span>
                </div>
                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(10,10,10,0.6)_100%)] pointer-events-none" />
                {/* Bottom gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <span className="font-display text-2xl text-bone">Yogesh</span>
                  <span className="block font-sans text-caption text-taupe mt-1">Founder & Lead Artist</span>
                </div>
              </div>
            </FadeInOnScroll>

            {/* Bio */}
            <FadeInOnScroll direction="right" delay={0.2}>
              <div>
                <h2 className="font-display text-display-lg text-bone leading-tight mb-6">
                  The vision behind PSY.
                </h2>
                <div className="space-y-4 font-sans text-body text-taupe leading-relaxed">
                  <p>
                    Yogesh founded PSY Tattoos with a singular belief — that tattoos are not mere decoration,
                    but an intimate dialogue between intent and skin. What began as a personal passion for art
                    evolved into one of Mumbai&apos;s most sought-after tattoo studios.
                  </p>
                  <p>
                    With years of dedicated practice, Yogesh has mastered multiple styles — from intricate
                    fine-line work and geometric precision to bold traditional pieces and expressive freehand
                    designs. Every session at PSY begins with a conversation, not a template.
                  </p>
                  <p>
                    His philosophy is simple: listen deeply, design intentionally, and execute with precision.
                    No flash walls, no rush. Each line is placed with purpose, each piece a collaboration
                    between artist and wearer.
                  </p>
                  <p>
                    Beyond the needle, Yogesh has expanded PSY into a lifestyle brand — curating handcrafted
                    jewelry and accessories through PSY Shop, each piece carrying the same ethos of mindful
                    craftsmanship.
                  </p>
                </div>

                {/* Social links */}
                <div className="flex items-center gap-6 mt-8">
                  <a
                    href={SOCIAL_LINKS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-taupe hover:text-psy-green transition-colors duration-300 group"
                  >
                    <Instagram className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-sans text-caption uppercase tracking-widest">Instagram</span>
                  </a>
                  <a
                    href={SOCIAL_LINKS.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-taupe hover:text-psy-green transition-colors duration-300 group"
                  >
                    <Facebook className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-sans text-caption uppercase tracking-widest">Facebook</span>
                  </a>
                </div>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* ━━━ STUDIO ETHOS ━━━ */}
      <section className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto text-center">
          <FadeInOnScroll direction="up" delay={0.1}>
            <h2 className="font-display text-display-lg text-bone leading-tight">
              Where the mind meets the skin.
            </h2>
          </FadeInOnScroll>
          <FadeInOnScroll direction="up" delay={0.2}>
            <p className="font-sans text-body text-taupe leading-relaxed mt-8 max-w-2xl mx-auto">
              PSY draws from the psychedelic — not in spectacle, but in depth. We believe every tattoo
              carries a frequency, a meaning that resonates beyond the surface. Our studio is a space
              of intention, where art meets ritual and ink becomes identity.
            </p>
          </FadeInOnScroll>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-16 border-t border-taupe/10">
            {[
              { number: "2024", label: "Established" },
              { number: "500+", label: "Pieces Created" },
              { number: "100%", label: "Custom Work" },
              { number: "Mumbai", label: "Based In" },
            ].map((stat, i) => (
              <FadeInOnScroll key={stat.label} direction="up" delay={0.1 * i}>
                <div className="text-center">
                  <span className="font-display text-display-lg text-bone block">{stat.number}</span>
                  <span className="font-sans text-caption text-taupe uppercase tracking-widest mt-2 block">
                    {stat.label}
                  </span>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ MAP & LOCATION ━━━ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-16">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                Find Us
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Map Embed */}
            <FadeInOnScroll direction="left" delay={0.1}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-taupe/10">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.123456789!2d72.8!3d19.1!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDA2JzAwLjAiTiA3MsKwNDgnMDAuMCJF!5e0!3m2!1sen!2sin!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) saturate(0.3) brightness(0.8)" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0"
                  title="PSY Tattoos Studio Location"
                />
              </div>
            </FadeInOnScroll>

            {/* Contact Info */}
            <FadeInOnScroll direction="right" delay={0.2}>
              <div className="space-y-8">
                <div>
                  <h3 className="font-display text-display-lg text-bone leading-tight mb-4">
                    Visit the Studio
                  </h3>
                  <p className="font-sans text-body text-taupe leading-relaxed">
                    Walk-ins welcome, appointments preferred. Come find us in the heart of Mumbai.
                  </p>
                </div>

                <div className="space-y-6">
                  <a
                    href={SOCIAL_LINKS.maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 text-taupe hover:text-bone transition-colors duration-300 group"
                  >
                    <MapPin className="w-5 h-5 mt-0.5 text-psy-green shrink-0" />
                    <div>
                      <span className="font-sans text-body text-bone block group-hover:text-psy-green transition-colors duration-300">
                        PSY Tattoos Studio
                      </span>
                      <span className="font-sans text-caption text-taupe block mt-1">
                        Mumbai, Maharashtra, India
                      </span>
                      <span className="font-sans text-micro text-psy-green uppercase tracking-widest mt-2 block">
                        Get Directions →
                      </span>
                    </div>
                  </a>

                  <div className="flex items-start gap-4 text-taupe">
                    <Clock className="w-5 h-5 mt-0.5 text-psy-green shrink-0" />
                    <div>
                      <span className="font-sans text-body text-bone block">Studio Hours</span>
                      <span className="font-sans text-caption text-taupe block mt-1">
                        Mon – Sat: 11:00 AM – 8:00 PM
                      </span>
                      <span className="font-sans text-caption text-taupe block">
                        Sunday: By Appointment
                      </span>
                    </div>
                  </div>
                </div>

                {/* Social CTA */}
                <div className="pt-4 border-t border-taupe/10">
                  <span className="font-sans text-caption text-taupe uppercase tracking-widest block mb-4">
                    Follow Us
                  </span>
                  <div className="flex items-center gap-4">
                    <a
                      href={SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-12 h-12 rounded-full border border-taupe/20 text-taupe hover:text-psy-green hover:border-psy-green/40 hover:shadow-[0_0_20px_rgba(59,163,124,0.15)] transition-all duration-300"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a
                      href={SOCIAL_LINKS.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-12 h-12 rounded-full border border-taupe/20 text-taupe hover:text-psy-green hover:border-psy-green/40 hover:shadow-[0_0_20px_rgba(59,163,124,0.15)] transition-all duration-300"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="py-32 px-6 text-center">
        <FadeInOnScroll direction="up">
          <h2 className="font-display font-light text-display-xl text-bone mb-4">
            Ready to begin?
          </h2>
          <p className="font-display italic text-taupe text-xl mb-10">
            — every tattoo begins with a conversation.
          </p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <Link
              href="/studio#book"
              className="border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-3 px-8 hover:bg-psy-green hover:text-ink transition-all duration-[400ms]"
            >
              Book a Session
            </Link>
            <Link
              href="/shop"
              className="text-cta font-sans uppercase tracking-widest text-caption text-bone"
            >
              Browse Shop →
            </Link>
          </div>
        </FadeInOnScroll>
      </section>
    </main>
  )
}
