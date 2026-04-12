"use client"

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
  maps: "https://maps.app.goo.gl/LuT5mfS5BdNn9pjy8",
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
          <p className="font-sans text-body-lg text-bone/70 text-center max-w-lg leading-relaxed">
            Psy Tattoos was born from a belief that existed long before we gave it a name, that tattooing is one of the oldest forms of emotional expression.
          </p>
        </FadeInOnScroll>
      </section>

      {/* ━━━ OUR STORY / WHAT WE BELIEVE ━━━ */}
      <section className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <FadeInOnScroll direction="up" delay={0.1}>
            <h2 className="font-display text-display-lg text-bone leading-tight">
              Where the mind meets the skin.
            </h2>
          </FadeInOnScroll>
          <FadeInOnScroll direction="up" delay={0.2}>
            <p className="font-sans text-body-lg text-bone/80 leading-relaxed mt-6 max-w-2xl">
              Ink has never just been ink.
            </p>
            <p className="font-sans text-body-lg text-bone/80 leading-relaxed mt-2 max-w-2xl">
              It has always been about reclaiming something. Identity. Survival. Belonging.
            </p>
          </FadeInOnScroll>

          <div className="mt-20 pt-16 border-t border-taupe/10 max-w-2xl">
            <FadeInOnScroll direction="up" delay={0.1}>
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro block mb-8">
                What We Believe
              </span>
              <p className="font-sans text-body-lg text-bone/70 leading-relaxed">
                Our logo is not just a symbol, it is rooted in the language of psychology.
                Because everything we do begins there.
              </p>
              <p className="font-sans text-body-lg text-bone/70 leading-relaxed mt-4">
                This studio is not just a place where you get tattooed.
                It is a space where you are witnessed.
              </p>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* ━━━ THE PSY EXPERIENCE ━━━ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-16">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                The PSY Experience
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
          </FadeInOnScroll>
          <FadeInOnScroll direction="up" delay={0.1}>
            <p className="font-sans text-body-lg text-bone/70 leading-relaxed max-w-2xl">
              Psy Tattoos exists at the intersection of mind, art, people, and progress.
            </p>
            <p className="font-display italic text-bone text-2xl mt-4">
              Not a trend. A movement.
            </p>
          </FadeInOnScroll>
        </div>
      </section>

      {/* ━━━ OUR FOUNDATIONS ━━━ */}
      <section className="py-24 px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-4">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                Our Foundations
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
            <p className="font-display text-display-lg text-bone leading-tight mb-16">
              Psychology. Art. Community. Technology.
            </p>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              {
                num: "01",
                title: "Psychology",
                body: "The mind is at the centre of everything we create. Tattooing is rarely just aesthetic, it is personal, healing, meaningful. We honour that.",
              },
              {
                num: "02",
                title: "Art",
                body: "Every line carries intention. Nothing here is decoration, it is expression.",
              },
              {
                num: "03",
                title: "Community",
                body: "More than a studio, a space to belong. For those who've felt outside, this is where you are seen.",
              },
              {
                num: "04",
                title: "Technology",
                body: "Beyond the needle. We're rethinking how you discover, experience, and tell your story.",
              },
            ].map((pillar, i) => (
              <FadeInOnScroll key={pillar.num} direction="up" delay={0.1 * i}>
                <div className="border-t border-taupe/20 pt-8">
                  <span className="font-display text-[2.5rem] leading-none text-bone/[0.12] select-none block mb-4">
                    {pillar.num}
                  </span>
                  <h3 className="font-display text-display-md text-bone mb-3">
                    {pillar.title}
                  </h3>
                  <p className="font-sans text-body-lg text-bone/60 leading-relaxed">
                    {pillar.body}
                  </p>
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
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d7536.674229759085!2d72.9377885!3d19.1804727!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b98b19b07b0f%3A0xd9dbf8128361885b!2sPsy%20Tattoos!5e0!3m2!1sen!2sin!4v1775468124002!5m2!1sen!2sin"
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
                        Open all days: 11:00 AM – 9:00 PM
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
