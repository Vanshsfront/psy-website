"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

const productSchema = z.object({
  name: z.string().min(2, "Name required"),
  slug: z.string().min(2, "Slug required"),
  category: z.string().min(2, "Category required"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  compare_at_price: z.coerce.number().optional().nullable(),
  description_short: z.string().optional(),
  material: z.string().optional(),
  tags: z.string().optional(), // We'll split by comma
  stock_status: z.boolean().default(true),
  is_featured: z.boolean().default(false),
})

type ProductFormData = z.infer<typeof productSchema>

export default function ProductForm({ initialData }: { initialData?: any }) {
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])
  const [variants, setVariants] = useState<string[]>(
    initialData?.variants?.map((v: any) => v.size || Object.values(v)[0]) || []
  )
  const [newVariant, setNewVariant] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      category: initialData?.category || "Rings",
      price: initialData?.price || 0,
      compare_at_price: initialData?.compare_at_price || null,
      description_short: initialData?.description_short || "",
      material: initialData?.material || "",
      tags: initialData?.tags?.join(", ") || "",
      stock_status: initialData?.stock_status ?? true,
      is_featured: initialData?.is_featured ?? false,
    }
  })

  // Watch name to auto-generate slug
  const nameValue = watch("name")
  
  const generateSlug = () => {
    if (nameValue && !initialData) {
      setValue("slug", nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
    }
  }

  // TipTap setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write a full rich description...' })
    ],
    content: initialData?.description_full || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none min-h-[200px] p-4 bg-background border border-borderDark rounded',
      },
    },
  })

  const addVariant = () => {
    if (newVariant.trim() && !variants.includes(newVariant.trim())) {
      setVariants([...variants, newVariant.trim()])
      setNewVariant("")
    }
  }
  
  const removeVariant = (v: string) => {
    setVariants(variants.filter(variant => variant !== v))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files)
      if (images.length + existingImages.length + selected.length > 6) {
        alert("Maximum 6 images allowed")
        return
      }
      setImages([...images, ...selected])
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    
    try {
      let uploadedImageUrls = [...existingImages]

      // Upload new images to Supabase Storage bucket 'product_images'
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('product_images')
          .upload(fileName, file)
          
        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('product_images').getPublicUrl(uploadData.path)
        uploadedImageUrls.push(publicUrlData.publicUrl)
      }

      const formattedVariants = variants.map(v => ({ size: v }))
      const formattedTags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []

      const productPayload = {
        name: data.name,
        slug: data.slug,
        category: data.category,
        price: data.price,
        compare_at_price: data.compare_at_price || null,
        description_short: data.description_short,
        description_full: editor?.getHTML() || "",
        material: data.material,
        tags: formattedTags,
        images: uploadedImageUrls,
        variants: formattedVariants,
        stock_status: data.stock_status,
        is_featured: data.is_featured,
      }

      if (initialData?.id) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', initialData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(productPayload)
        if (error) throw error
      }

      router.push("/admin/products")
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert("Failed to save product: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-surface p-8 border border-borderDark rounded max-w-4xl">
      
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-mutedText">Product Name</label>
          <Input {...register("name")} placeholder="Onyx Ring" onBlur={generateSlug} />
          {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-mutedText">Slug URL</label>
          <Input {...register("slug")} placeholder="onyx-ring" />
          {errors.slug && <p className="text-danger text-xs mt-1">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-mutedText">Category</label>
          <select 
            {...register("category")}
            className="flex h-10 w-full rounded border border-borderDark bg-background px-3 py-2 text-sm text-primaryText focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan"
          >
            <option>Rings</option>
            <option>Necklaces</option>
            <option>Earrings</option>
            <option>Bracelets</option>
            <option>Cuffs</option>
            <option>Limited Edition</option>
          </select>
          {errors.category && <p className="text-danger text-xs mt-1">{errors.category.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-mutedText">Price (₹)</label>
          <Input {...register("price")} type="number" placeholder="2999" />
          {errors.price && <p className="text-danger text-xs mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-mutedText">Compare at Price (₹)</label>
          <Input {...register("compare_at_price")} type="number" placeholder="3999" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-mutedText">Short Description</label>
        <Input {...register("description_short")} placeholder="A brief hook line for the product card..." />
      </div>

      {/* Rich Text Editor */}
      <div>
        <label className="block text-sm font-medium mb-2 text-mutedText">Full Description</label>
        <div className="border border-borderDark rounded overflow-hidden">
          {/* Simple Toolbar */}
          <div className="bg-surfaceLighter p-2 border-b border-borderDark flex gap-2">
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`px-2 py-1 text-xs font-bold rounded ${editor?.isActive('bold') ? 'bg-borderDark text-white' : 'text-mutedText hover:bg-borderDark'}`}>B</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`px-2 py-1 text-xs italic rounded ${editor?.isActive('italic') ? 'bg-borderDark text-white' : 'text-mutedText hover:bg-borderDark'}`}>I</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 text-xs rounded ${editor?.isActive('heading') ? 'bg-borderDark text-white' : 'text-mutedText hover:bg-borderDark'}`}>H2</button>
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-mutedText">Material</label>
          <Input {...register("material")} placeholder="925 Sterling Silver" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-mutedText">Tags (comma separated)</label>
          <Input {...register("tags")} placeholder="dark, gothic, unisex" />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-8 border-y border-borderDark py-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" {...register("stock_status")} className="w-5 h-5 accent-neon-green bg-background border-borderDark rounded" />
          <span className="text-sm font-medium">In Stock</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" {...register("is_featured")} className="w-5 h-5 accent-neon-purple bg-background border-borderDark rounded" />
          <span className="text-sm font-medium">Featured Product</span>
        </label>
      </div>

      {/* Variants */}
      <div>
        <label className="block text-sm font-medium mb-2 text-mutedText">Variants / Sizes</label>
        <div className="flex gap-2 mb-3">
          <Input value={newVariant} onChange={e => setNewVariant(e.target.value)} placeholder="e.g. Size 7, Size 8..." className="max-w-xs" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariant())} />
          <Button type="button" onClick={addVariant} variant="outline">Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => (
            <div key={v} className="bg-surfaceLighter border border-borderDark px-3 py-1 rounded text-sm flex items-center gap-2">
              {v} <button type="button" onClick={() => removeVariant(v)} className="text-danger hover:text-red-400">×</button>
            </div>
          ))}
          {variants.length === 0 && <span className="text-xs text-mutedText">No variants (one size fits all)</span>}
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium mb-2 text-mutedText">Images (Max 6)</label>
        <Input type="file" multiple accept="image/*" onChange={handleImageChange} className="mb-4 pt-1.5" />
        
        <div className="flex flex-wrap gap-4">
          {existingImages.map((url, i) => (
            <div key={url} className="w-24 h-24 rounded border border-borderDark overflow-hidden relative group">
              <img src={url} alt="Existing" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setExistingImages(existingImages.filter(e => e !== url))} className="absolute inset-0 bg-black/60 flex items-center justify-center text-danger opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
            </div>
          ))}
          {images.map((file, i) => (
            <div key={file.name} className="w-24 h-24 rounded border border-neon-cyan overflow-hidden relative group">
              <img src={URL.createObjectURL(file)} alt="New" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setImages(images.filter(f => f !== file))} className="absolute inset-0 bg-black/60 flex items-center justify-center text-danger opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-6 border-t border-borderDark flex justify-end gap-4">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>Cancel</Button>
        <Button type="submit" variant="neon" disabled={isSubmitting}>
          {isSubmitting ? "SΛVING..." : (initialData ? "UPDATE ARSENAL" : "CREATE ARSENAL")}
        </Button>
      </div>

    </form>
  )
}
