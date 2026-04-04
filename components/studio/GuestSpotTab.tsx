"use client"

import { useState } from "react"
import Image from "next/image"
import { Instagram } from "lucide-react"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import type { GuestSpot } from "@/types"

function LeadForm({ guestSpotId }: { guestSpotId: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) return
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/guest-spot-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guest_spot_id: guestSpotId }),
      })
      if (!res.ok) throw new Error("Failed to submit")
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 p-4 border border-psy-green/30 bg-psy-green/5">
        <p className="font-sans text-caption text-psy-green">
          Thanks! We&apos;ll reach out when the guest spot opens for booking.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Your name *"
          required
          className="w-full border border-[#2a2a2a] bg-transparent px-3 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
        />
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email *"
          type="email"
          required
          className="w-full border border-[#2a2a2a] bg-transparent px-3 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
        />
      </div>
      <input
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        placeholder="Phone (optional)"
        className="w-full border border-[#2a2a2a] bg-transparent px-3 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
      />
      <textarea
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        placeholder="Tell us about your idea..."
        rows={3}
        className="w-full border border-[#2a2a2a] bg-transparent px-3 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors resize-none"
      />
      {error && <p className="text-sm text-terracotta">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-2.5 px-8 hover:bg-psy-green hover:text-ink transition-all duration-[400ms] disabled:opacity-50"
      >
        {submitting ? "Sending..." : "I'm Interested"}
      </button>
    </form>
  )
}

export default function GuestSpotTab({
  guestSpots,
}: {
  guestSpots: GuestSpot[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (guestSpots.length === 0) {
    return (
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-display italic text-taupe text-body-lg">
            No guest spots at the moment. Check back soon.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeInOnScroll direction="none">
          <div className="flex items-center mb-12">
            <span className="font-sans uppercase tracking-[0.2em] text-taupe text-micro shrink-0">
              Guest Artists
            </span>
            <div className="flex-1 mx-6 h-[1px] bg-taupe/20" />
          </div>
        </FadeInOnScroll>

        <div className="space-y-16">
          {guestSpots.map((spot, i) => (
            <FadeInOnScroll key={spot.id} direction="up" delay={i * 0.1}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Portfolio images */}
                <div className="grid grid-cols-2 gap-2">
                  {spot.portfolio_images.slice(0, 4).map((img, j) => (
                    <div
                      key={j}
                      className={`relative overflow-hidden bg-[#1a1a1a] ${
                        j === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${spot.artist_name} work ${j + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                  {spot.portfolio_images.length === 0 && (
                    <div className="col-span-2 aspect-[4/3] bg-[#1a1a1a] flex items-center justify-center text-taupe font-sans text-caption">
                      No images yet
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <h3 className="font-display text-display-lg text-bone leading-tight">
                    {spot.artist_name}
                  </h3>

                  {spot.dates_available && (
                    <p className="font-sans text-caption text-psy-green uppercase tracking-widest mt-3">
                      {spot.dates_available}
                    </p>
                  )}

                  {spot.bio && (
                    <p className="font-sans text-body text-taupe leading-relaxed mt-4">
                      {spot.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-4">
                    {spot.instagram && (
                      <a
                        href={`https://instagram.com/${spot.instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-taupe hover:text-psy-green transition-colors"
                      >
                        <Instagram className="w-4 h-4" />
                        <span className="font-sans text-caption">{spot.instagram}</span>
                      </a>
                    )}
                  </div>

                  {/* CTA */}
                  {expandedId === spot.id ? (
                    <LeadForm guestSpotId={spot.id} />
                  ) : (
                    <button
                      onClick={() => setExpandedId(spot.id)}
                      className="mt-6 border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-2.5 px-8 hover:bg-psy-green hover:text-ink transition-all duration-[400ms]"
                    >
                      I&apos;m Interested
                    </button>
                  )}
                </div>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
