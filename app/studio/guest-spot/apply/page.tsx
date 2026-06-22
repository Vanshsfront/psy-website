"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, X, Loader2 } from "lucide-react"
import { useImageUpload } from "@/hooks/useImageUpload"

const ARTIST_TYPES = [
  "Tattoo Artist",
  "Piercer",
  "Illustrator",
  "Jewelry Artist",
  "Other",
]

const inputClass =
  "w-full border border-[#2a2a2a] bg-transparent px-3 py-2.5 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"

export default function GuestArtistApplyPage() {
  const { upload } = useImageUpload()
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    type_of_artist: "",
    years_experience: "",
    portfolio_link: "",
  })
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError("")
    try {
      const results = await Promise.all(
        Array.from(files).map((file) =>
          upload(file, "guest-applications", "submissions")
        )
      )
      setImages((prev) => [...prev, ...results.map((r) => r.url)])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (url: string) =>
    setImages((prev) => prev.filter((u) => u !== url))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email) {
      setError("Please fill in your name and email.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/guest-artist-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, images }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to submit")
      }
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="w-full bg-ink min-h-screen text-bone pt-24 pb-32">
      <div className="max-w-2xl mx-auto px-6">
        <Link
          href="/studio/guest-spot"
          className="inline-flex items-center gap-2 text-taupe hover:text-bone transition-colors text-caption font-sans uppercase tracking-widest mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Guest Spot
        </Link>

        <h1 className="font-display font-light text-display-xl text-bone leading-tight">
          Guest Spot With Us
        </h1>
        <p className="font-sans text-body text-taupe mt-3 mb-10 max-w-md">
          Tell us about yourself and share your work. We&apos;ll be in touch if
          it feels like a fit.
        </p>

        {submitted ? (
          <div className="p-6 border border-psy-green/30 bg-psy-green/5">
            <p className="font-display text-display-md text-bone mb-2">
              Application received.
            </p>
            <p className="font-sans text-body text-taupe">
              Thanks for applying to guest with us. We review every application
              and will reach out if there&apos;s a match.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                  First Name *
                </label>
                <input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                  Last Name *
                </label>
                <input
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                  Email *
                </label>
                <input
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  type="email"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                  Type of Artist
                </label>
                <select
                  value={form.type_of_artist}
                  onChange={(e) => set("type_of_artist", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {ARTIST_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-ink">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                  Years of Experience
                </label>
                <input
                  value={form.years_experience}
                  onChange={(e) => set("years_experience", e.target.value)}
                  type="number"
                  min="0"
                  placeholder="Enter a number"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                Link to Portfolio / Social media
              </label>
              <input
                value={form.portfolio_link}
                onChange={(e) => set("portfolio_link", e.target.value)}
                placeholder="https://instagram.com/..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-2">
                Portfolio Images
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {images.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden bg-[#1a1a1a]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Portfolio"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute top-1 right-1 bg-ink/80 text-bone rounded-full p-1 hover:bg-ink"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer border border-[#2a2a2a] hover:border-psy-green text-taupe hover:text-bone px-4 py-2.5 text-sm transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>Add images</>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  hidden
                  disabled={uploading}
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
              <p className="font-sans text-micro text-taupe/60 mt-2">
                JPG, PNG, WebP or AVIF. Up to 5MB each.
              </p>
            </div>

            {error && <p className="text-sm text-terracotta">{error}</p>}

            <button
              type="submit"
              disabled={submitting || uploading}
              className="border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-3 px-10 hover:bg-psy-green hover:text-ink transition-all duration-[400ms] disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
