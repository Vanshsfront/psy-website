import { createSSRClient } from "@/lib/supabase-server"
import ShopClient from "@/components/shop/ShopClient"

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function ShopHome({
  searchParams,
}: {
  searchParams?: { category?: string }
}) {
  const supabase = await createSSRClient()

  // Fetch ALL products — filtering is now done client-side to avoid page reload
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("is_deleted", false)

  const category = searchParams?.category || "All"

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
