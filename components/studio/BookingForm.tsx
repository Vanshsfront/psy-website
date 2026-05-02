"use client"

import { useState } from "react"
import { useForm as useRHForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Artist } from "@/types"
import { createClient } from "@/lib/supabase"

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  inquiry_type: z.string().min(1, "Please select a type of inquiry"),
  phone: z.string().optional(),
  artist_id: z.string().optional(),
  description: z.string().optional(),
  preferred_date: z.string().optional(),
  reference_image: z.any().optional(),
})

type FormData = z.infer<typeof bookingSchema>

export default function BookingForm({
  artists,
}: {
  artists: Artist[]
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useRHForm<FormData>({
    resolver: zodResolver(bookingSchema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      let referenceImageUrl: string | null = null

      if (data.reference_image && data.reference_image.length > 0) {
        const file = data.reference_image[0]
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("reference_images")
          .upload(fileName, file)

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("reference_images")
            .getPublicUrl(uploadData.path)
          referenceImageUrl = publicUrlData.publicUrl
        }
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          inquiry_type: data.inquiry_type,
          phone: data.phone || null,
          artist_id: data.artist_id || null,
          description: data.description || null,
          preferred_date: data.preferred_date || null,
          reference_image_url: referenceImageUrl,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to submit booking")
      }

      setSuccess(true)
      reset()
    } catch (error) {
      console.error("Booking error:", error)
      alert("Something went quiet. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="py-16 text-center">
        <h3 className="font-display text-display-lg text-psy-green mb-4">
          Booking Requested
        </h3>
        <p className="font-sans text-body text-taupe mb-8">
          We will review your idea and reach out shortly.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="border border-taupe bg-transparent text-taupe uppercase tracking-widest text-caption py-3 px-8 rounded-[2px] hover:border-bone hover:text-bone transition-all duration-[400ms] cursor-pointer"
        >
          Book Another
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 text-left"
    >
      {/* Row: Name / Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Name *
          </label>
          <Input {...register("name")} placeholder="Your name" />
          {errors.name && (
            <p className="text-terracotta text-micro mt-2">
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Email *
          </label>
          <Input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="text-terracotta text-micro mt-2">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      {/* Row: Type of Inquiry / Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Type of Inquiry *
          </label>
          <select
            {...register("inquiry_type")}
            className="flex h-12 w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body text-bone font-sans focus:border-psy-green focus:outline-none transition-colors duration-[400ms] cursor-pointer"
          >
            <option value="" className="bg-ink text-bone">
              Select type
            </option>
            <option value="Tattoo" className="bg-ink text-bone">Tattoo</option>
            <option value="Piercing" className="bg-ink text-bone">Piercing</option>
            <option value="Jewellery" className="bg-ink text-bone">Jewellery</option>
            <option value="Custom Art" className="bg-ink text-bone">Custom Art</option>
            <option value="Other" className="bg-ink text-bone">Other</option>
          </select>
          {errors.inquiry_type && (
            <p className="text-terracotta text-micro mt-2">
              {errors.inquiry_type.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Phone (Optional)
          </label>
          <Input {...register("phone")} placeholder="+91 XXXXX XXXXX" />
        </div>
      </div>

      {/* Preferred Artist */}
      <div>
        <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
          Preferred Artist (Optional)
        </label>
        <select
          {...register("artist_id")}
          className="flex h-12 w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body text-bone font-sans focus:border-psy-green focus:outline-none transition-colors duration-[400ms] cursor-pointer"
        >
          <option value="" className="bg-ink text-bone">
            Any Artist
          </option>
          {artists.map((a) => (
            <option key={a.id} value={a.id} className="bg-ink text-bone">
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Textarea: Tell us about your idea */}
      <div>
        <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
          Tell us about your idea (Optional)
        </label>
        <textarea
          {...register("description")}
          className="flex min-h-[160px] w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body text-bone font-sans placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors duration-[400ms] resize-none"
          placeholder="Describe your tattoo idea, placement, and size..."
        />
      </div>

      {/* Row: Date / Reference Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Preferred Date (Optional)
          </label>
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className="flex h-12 w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body font-sans focus:border-psy-green focus:outline-none transition-colors duration-[400ms] cursor-pointer text-left"
          >
            <span className={selectedDate ? "text-bone" : "text-taupe/60"}>
              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
            </span>
          </button>
          {calendarOpen && (
            <div className="mt-2 border border-taupe/20 bg-[#111111] p-3 rounded">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date)
                  if (date) {
                    register("preferred_date").onChange({
                      target: { name: "preferred_date", value: format(date, "yyyy-MM-dd") },
                    })
                  }
                  setCalendarOpen(false)
                }}
                disabled={{ before: new Date() }}
                components={{
                  Chevron: ({ orientation, size = 20, className }) => {
                    const points: Record<string, string> = {
                      up: "6.77 17 12.5 11.43 18.24 17 20 15.28 12.5 8 5 15.28",
                      down: "6.77 8 12.5 13.57 18.24 8 20 9.72 12.5 17 5 9.72",
                      left: "16 18.112 9.81111111 12 16 5.87733333 14.0888889 4 6 12 14.0888889 20",
                      right: "8 18.112 14.18888889 12 8 5.87733333 9.91111111 4 18 12 9.91111111 20",
                    }
                    return (
                      <svg
                        className={className}
                        width={size}
                        height={size}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <polygon points={points[orientation ?? "left"]} />
                      </svg>
                    )
                  },
                }}
                classNames={{
                  root: "font-sans text-bone",
                  month_caption: "font-display text-bone text-lg mb-2",
                  nav: "flex gap-2",
                  button_previous: "text-taupe hover:text-bone p-1 transition-colors",
                  button_next: "text-taupe hover:text-bone p-1 transition-colors",
                  weekday: "text-taupe text-micro uppercase tracking-widest w-10 text-center",
                  day: "w-10 h-10 text-center text-caption rounded transition-colors",
                  day_button: "w-full h-full rounded hover:bg-psy-green/20 transition-colors cursor-pointer",
                  selected: "!bg-psy-green !text-ink font-medium",
                  today: "text-psy-green font-medium",
                  disabled: "text-taupe/30 cursor-not-allowed",
                }}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Inspiration Image (Optional)
          </label>
          <Input
            type="file"
            {...register("reference_image")}
            accept="image/*"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-4 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? "Submitting..." : "Start Your Journey"}
      </button>

      <p className="text-center font-sans text-micro text-taupe/60">
        By booking, you agree to review and sign our{" "}
        <a
          href="/consent"
          target="_blank"
          rel="noopener noreferrer"
          className="text-psy-green hover:text-bone underline underline-offset-2 transition-colors"
        >
          consent form
        </a>{" "}
        before your session.
      </p>
    </form>
  )
}
