"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

const schema = z.object({
  name: z.string().min(2, "Name required"),
  slug: z.string().min(2, "Slug required"),
  bio: z.string().min(10, "Bio required"),
  instagram: z.string().optional(),
  specialties: z.string().min(2, "At least one specialty required"),
})

type FormData = z.infer<typeof schema>

export default function ArtistForm() {
  const [image, setImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const nameValue = watch("name")
  const generateSlug = () => {
    if (nameValue) setValue("slug", nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      let imageUrl = ""

      if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${Date.now()}-artist.${fileExt}`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('product_images') // Using same bucket for simplicity here, ideally make an 'artists' bucket
          .upload(`artists/${fileName}`, image)
          
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('product_images').getPublicUrl(uploadData.path)
        imageUrl = publicUrlData.publicUrl
      }

      const { error } = await supabase.from('artists').insert({
        name: data.name,
        slug: data.slug,
        bio: data.bio,
        instagram: data.instagram,
        specialties: data.specialties.split(',').map(s => s.trim()).filter(Boolean),
        image_url: imageUrl || null
      })

      if (error) throw error

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
        </div>
        <div>
          <label className="block text-sm mb-2 text-mutedText">Slug</label>
          <Input {...register("slug")} />
        </div>
      </div>

      <div>
         <label className="block text-sm mb-2 text-mutedText">Bio</label>
         <textarea {...register("bio")} className="w-full h-32 bg-background border border-borderDark rounded p-3 text-sm focus:ring-1 focus:ring-neon-cyan outline-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 text-mutedText">Instagram Handle</label>
          <Input {...register("instagram")} placeholder="@username" />
        </div>
        <div>
          <label className="block text-sm mb-2 text-mutedText">Specialties (comma separated)</label>
          <Input {...register("specialties")} placeholder="Blackwork, Fine Line" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2 text-mutedText">Profile Picture</label>
        <Input type="file" accept="image/*" onChange={e => e.target.files && setImage(e.target.files[0])} className="pt-1.5" />
      </div>

      <div className="pt-4 border-t border-borderDark flex justify-end">
        <Button type="submit" variant="neon" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Create Artist"}</Button>
      </div>
    </form>
  )
}
