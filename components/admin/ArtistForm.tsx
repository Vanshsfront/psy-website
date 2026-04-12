"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import type { Artist } from "@/types"

const schema = z.object({
  name: z.string().min(2, "Name required"),
  slug: z.string().min(2, "Slug required"),
  bio: z.string().min(10, "Bio required"),
  instagram: z.string().optional(),
  speciality: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ArtistFormProps {
  artist?: Artist | null
}

export default function ArtistForm({ artist }: ArtistFormProps) {
  const [image, setImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!artist

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: artist
      ? {
          name: artist.name,
          slug: artist.slug,
          bio: artist.bio || "",
          instagram: artist.instagram || "",
          speciality: artist.speciality || "",
        }
      : undefined,
  })

  const nameValue = watch("name")
  const generateSlug = () => {
    if (nameValue && !isEditing) setValue("slug", nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      let imageUrl = artist?.profile_photo_url || ""

      if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${Date.now()}-artist.${fileExt}`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('artist-photos')
          .upload(`artists/${fileName}`, image)
          
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('artist-photos').getPublicUrl(uploadData.path)
        imageUrl = publicUrlData.publicUrl
      }

      const payload = {
        name: data.name,
        slug: data.slug,
        bio: data.bio,
        instagram: data.instagram || null,
        speciality: data.speciality || null,
        profile_photo_url: imageUrl || null,
      }

      if (isEditing) {
        // Update via API route
        const res = await fetch(`/api/admin/artists/${artist.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Update failed")
        }
      } else {
        // Create via API route
        const res = await fetch("/api/admin/artists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Create failed")
        }
      }

      // Revalidate public pages
      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: ["/studio", "/studio/artists"],
        }),
      })

      router.push("/admin/artists")
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl bg-surface p-6 border border-borderDark rounded">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 text-mutedText">Name</label>
          <Input {...register("name")} onBlur={generateSlug} />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-2 text-mutedText">Slug</label>
          <Input {...register("slug")} />
          {errors.slug && <p className="text-xs text-danger mt-1">{errors.slug.message}</p>}
        </div>
      </div>

      <div>
         <label className="block text-sm mb-2 text-mutedText">Bio</label>
         <textarea {...register("bio")} className="w-full h-32 bg-background border border-borderDark rounded p-3 text-sm focus:ring-1 focus:ring-neon-cyan outline-none" />
         {errors.bio && <p className="text-xs text-danger mt-1">{errors.bio.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 text-mutedText">Instagram Handle</label>
          <Input {...register("instagram")} placeholder="@username" />
        </div>
        <div>
          <label className="block text-sm mb-2 text-mutedText">Category</label>
          <select
            {...register("speciality")}
            className="flex h-10 w-full border border-borderDark bg-background px-3 py-2 text-sm text-bone rounded focus:border-neon-green focus:outline-none transition-colors"
          >
            <option value="">Select category</option>
            <option value="Tattoos">Tattoos</option>
            <option value="Piercings">Piercings</option>
            <option value="Custom Artwork">Custom Artwork</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2 text-mutedText">Profile Picture</label>
        {isEditing && artist?.profile_photo_url && !image && (
          <div className="mb-3 flex items-center gap-3">
            <img
              src={artist.profile_photo_url}
              alt={artist.name}
              className="w-16 h-16 rounded object-cover border border-borderDark"
            />
            <span className="text-xs text-mutedText">Current photo — select a new file to replace</span>
          </div>
        )}
        <Input type="file" accept="image/*" onChange={e => e.target.files && setImage(e.target.files[0])} className="pt-1.5" />
      </div>

      <div className="pt-4 border-t border-borderDark flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/artists")}>
          Cancel
        </Button>
        <Button type="submit" variant="neon" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update Artist" : "Create Artist"}
        </Button>
      </div>
    </form>
  )
}
