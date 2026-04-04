"use client"

import { useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import type { CustomerTestimonial } from "@/types"

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`text-sm ${n <= rating ? "text-amber-400" : "text-[#2a2a2a]"}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function CustomersTab({
  testimonials,
}: {
  testimonials: CustomerTestimonial[]
}) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (testimonials.length === 0) {
    return (
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-display italic text-taupe text-body-lg">
            Reviews coming soon.
          </p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeInOnScroll direction="none">
            <div className="flex items-center mb-12">
              <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
                Our Customers
              </span>
              <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
            </div>
          </FadeInOnScroll>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {testimonials.map((t, i) => (
              <FadeInOnScroll key={t.id} direction="up" delay={i * 0.06}>
                <div className="break-inside-avoid bg-[#111111] border border-[#2a2a2a] p-6 hover:border-taupe/30 transition-colors duration-300">
                  {t.image_url && (
                    <button
                      onClick={() => setLightbox(t.image_url)}
                      className="w-full mb-4 cursor-pointer"
                    >
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={t.image_url}
                          alt={`Review by ${t.customer_name}`}
                          fill
                          className="object-cover hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                    </button>
                  )}

                  {t.rating && <Stars rating={t.rating} />}

                  {t.review_text && (
                    <p className="font-display italic text-body text-taupe leading-relaxed mt-3">
                      &ldquo;{t.review_text}&rdquo;
                    </p>
                  )}

                  <p className="font-sans text-caption text-bone mt-4">
                    — {t.customer_name}
                  </p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-bone hover:text-taupe transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-3xl w-full max-h-[80vh]">
            <Image
              src={lightbox}
              alt="Review screenshot"
              width={900}
              height={600}
              className="object-contain w-full h-full"
            />
          </div>
        </div>
      )}
    </>
  )
}
