import { createSSRClient } from "@/lib/supabase-server"
import Link from "next/link"
import ShopClient from "@/components/shop/ShopClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function ShopHome({
  searchParams,
}: {
  searchParams?: { category?: string }
}) {
  const supabase = await createSSRClient()

  const category = searchParams?.category || "All"

  let query = supabase.from("products").select("*").eq("is_deleted", false)

  if (category !== "All") {
    query = query.eq("category", category)
  }

  const { data: products } = await query

  const categories = [
    "All",
    "Rings",
    "Necklaces",
    "Earrings",
    "Bracelets",
    "Cuffs",
    "Limited Edition",
  ]

  return (
    <ShopClient
      products={products || []}
      categories={categories}
      activeCategory={category}
    />
  )
}
