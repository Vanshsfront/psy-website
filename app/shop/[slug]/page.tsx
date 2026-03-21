import { createSSRClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import ProductDetailClient from "@/components/shop/ProductDetailClient"

export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const supabase = await createSSRClient()
  
  // Fetch main product
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!product || error) {
    notFound()
  }

  // Fetch related products (same category, different ID)
  const { data: relatedProducts } = await supabase
    .from('products')
    .select('*')
    .eq('category', product.category)
    .neq('id', product.id)
    .limit(4)

  return (
    <main className="min-h-screen bg-background">
      <ProductDetailClient product={product as any} relatedProducts={(relatedProducts || []) as any[]} />
    </main>
  )
}
