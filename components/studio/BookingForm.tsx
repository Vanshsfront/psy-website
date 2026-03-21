"use client"

import { useState } from "react"
import { useForm as useRHForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Artist, CustomStyle } from "@/types"
import { createClient } from "@/lib/supabase"

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  artist_id: z.string().optional(),
  style: z.string().min(1, "Please select a style"),
  description: z.string().min(10, "Tell us a bit more about your idea"),
  preferred_date: z.string().min(1, "Please select a date"),
  reference_image: z.any().optional(),
})

type FormData = z.infer<typeof bookingSchema>

export default function BookingForm({
  artists,
  styles,
}: {
  artists: Artist[]
  styles: CustomStyle[]
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
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
      let referenceImageUrl = null

      if (data.reference_image && data.reference_image.length > 0) {
        const file = data.reference_image[0]
        const fileExt = file.name.split(".").pop()
        const fileName = `${Math.random()}.${fileExt}`

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

      const { error } = await supabase.from("bookings").insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        artist_id: data.artist_id || null,
        style: data.style,
        description: data.description,
        preferred_date: data.preferred_date,
        reference_image_url: referenceImageUrl,
      })

      if (error) throw error

      setSuccess(true)
      reset()
    } catch (error) {
      console.error("Booking error:", error)
      alert("Something went quiet. Try again.")
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
      {/* Row: Name / Email / Phone */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Name
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
            Email
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
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Phone
          </label>
          <Input {...register("phone")} placeholder="+91 XXXXX XXXXX" />
          {errors.phone && (
            <p className="text-terracotta text-micro mt-2">
              {errors.phone.message}
            </p>
          )}
        </div>
      </div>

      {/* Row: Artist / Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Preferred Artist
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
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Style
          </label>
          <select
            {...register("style")}
            className="flex h-12 w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body text-bone font-sans focus:border-psy-green focus:outline-none transition-colors duration-[400ms] cursor-pointer"
          >
            <option value="" className="bg-ink text-bone">
              Select a style
            </option>
            {styles.map((s) => (
              <option key={s.id} value={s.name} className="bg-ink text-bone">
                {s.name}
              </option>
            ))}
            {styles.length === 0 && (
              <>
                <option value="Traditional" className="bg-ink text-bone">
                  Traditional
                </option>
                <option value="Blackwork" className="bg-ink text-bone">
                  Blackwork
                </option>
                <option value="Fine-line" className="bg-ink text-bone">
                  Fine-line
                </option>
              </>
            )}
          </select>
          {errors.style && (
            <p className="text-terracotta text-micro mt-2">
              {errors.style.message}
            </p>
          )}
        </div>
      </div>

      {/* Textarea: Tell us about your idea */}
      <div>
        <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
          Tell us about your idea
        </label>
        <textarea
          {...register("description")}
          className="flex min-h-[160px] w-full border-0 border-b border-taupe/40 bg-transparent px-0 py-3 text-body text-bone font-sans placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors duration-[400ms] resize-none"
          placeholder="Describe your tattoo idea, placement, and size..."
        />
        {errors.description && (
          <p className="text-terracotta text-micro mt-2">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Row: Date / Reference Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Preferred Date
          </label>
          <Input {...register("preferred_date")} type="date" />
          {errors.preferred_date && (
            <p className="text-terracotta text-micro mt-2">
              {errors.preferred_date.message}
            </p>
          )}
        </div>
        <div>
          <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
            Reference Image (Optional)
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
    </form>
  )
}
