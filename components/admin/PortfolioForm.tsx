"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

const schema = z.object({
  title: z.string().min(2, "Title required"),
  category: z.string().min(2, "Category required"),
  artist_id: z.string().uuid("Artist required"),
})

type FormData = z.infer<typeof schema>

export default function PortfolioForm() {
  const [image, setImage] = useState<File | null>(null)
  const [artists, setArtists] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('artists').select('id, name').order('name').then(({data}) => {
      if(data) setArtists(data)
    })
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    if (!image) return alert("Image is required for portfolio piece")
    setIsSubmitting(true)
    try {
      let imageUrl = ""
      const fileExt = image.name.split('.').pop()
      const fileName = `${Date.now()}-portfolio.${fileExt}`

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product_images') // Using same bucket placeholder
        .upload(`portfolio/${fileName}`, image)
        
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('product_images').getPublicUrl(uploadData.path)
      imageUrl = publicUrlData.publicUrl

      const { error } = await supabase.from('portfolio_items').insert({
        title: data.title,
        category: data.category,
        artist_id: data.artist_id,
        image_url: imageUrl
      })

      if (error) throw error

      router.push("/admin/portfolio")
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl bg-surface p-6 border border-borderDark rounded">
      
      <div>
        <label className="block text-sm mb-2 text-mutedText">Piece Title (Optional)</label>
        <Input {...register("title")} placeholder="Cybernetic Sleeve Part 1" />
        {errors.title && <span className="text-danger text-xs">{errors.title.message}</span>}
      </div>

      <div>
        <label className="block text-sm mb-2 text-mutedText">Style / Category</label>
        <select {...register("category")} className="w-full h-10 bg-background border border-borderDark rounded px-3 text-sm focus:ring-1 focus:ring-neon-cyan outline-none">
          <option value="">Select Category</option>
          <option value="Blackwork">Blackwork</option>
          <option value="Cyberpunk">Cyberpunk</option>
          <option value="Fine Line">Fine Line</option>
          <option value="Japanese">Japanese</option>
          <option value="Realism">Realism</option>
        </select>
        {errors.category && <span className="text-danger text-xs">{errors.category.message}</span>}
      </div>

      <div>
        <label className="block text-sm mb-2 text-mutedText">Artist</label>
        <select {...register("artist_id")} className="w-full h-10 bg-background border border-borderDark rounded px-3 text-sm focus:ring-1 focus:ring-neon-cyan outline-none">
          <option value="">Select an Artist</option>
          {artists.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {errors.artist_id && <span className="text-danger text-xs">{errors.artist_id.message}</span>}
      </div>

      <div>
        <label className="block text-sm mb-2 text-mutedText">Artwork Image</label>
        <Input type="file" accept="image/*" onChange={e => e.target.files && setImage(e.target.files[0])} className="pt-1.5" required />
      </div>

      <div className="pt-4 border-t border-borderDark">
        <Button type="submit" variant="neon" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Uploading..." : "Add to Gallery"}
        </Button>
      </div>

    </form>
  )
}
