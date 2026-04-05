import { createSSRClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import Link from "next/link"
import ProductCard from "@/components/shop/ProductCard"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"
import StaggeredGrid from "@/components/animations/StaggeredGrid"
import HoverLift from "@/components/animations/HoverLift"
import { Product } from "@/types"

export const revalidate = 60

export default async function CollectionDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = await createSSRClient()

  // Fetch collection by slug
  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single()

  if (!collection) {
    notFound()
  }

  // Fetch products in this collection via join table
  const { data: collectionProducts } = await supabase
    .from("collection_products")
    .select(
      `
      product_id,
      products:product_id (
        id,
        name,
        slug,
        description_short,
        category,
        price,
        compare_at_price,
        material,
        tags,
        images,
        variants,
        stock_status,
        stock_quantity,
        is_featured,
        is_deleted,
        created_at,
        updated_at
      )
    `
    )
    .eq("collection_id", collection.id)

  // Flatten and filter out deleted products
  const products: Product[] = (collectionProducts || [])
    .map((cp: any) => cp.products)
    .filter((p: any) => p && !p.is_deleted)

  return (
    <main className="min-h-screen bg-ink pt-28 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <FadeInOnScroll>
          <nav className="flex items-center gap-2 text-caption text-taupe mb-10">
            <Link
              href="/shop"
              className="hover:text-bone transition-colors duration-[400ms]"
            >
              Shop
            </Link>
            <span>/</span>
            <Link
              href="/shop/collections"
              className="hover:text-bone transition-colors duration-[400ms]"
            >
              Collections
            </Link>
            <span>/</span>
            <span className="text-bone">{collection.name}</span>
          </nav>
        </FadeInOnScroll>

        {/* Collection header */}
        <FadeInOnScroll>
          <div className="mb-16">
            <h1 className="font-display text-display-xl text-bone mb-4">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-taupe text-body-lg max-w-3xl">
                {collection.description}
              </p>
            )}
          </div>
        </FadeInOnScroll>

        {/* Product grid */}
        {products.length > 0 ? (
          <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16">
            {products.map((product) => (
              <HoverLift key={product.id}>
                <ProductCard product={product} />
              </HoverLift>
            ))}
          </StaggeredGrid>
        ) : (
          <FadeInOnScroll>
            <div className="text-center py-24">
              <p className="text-taupe text-body-lg">
                This collection is empty.
              </p>
              <Link
                href="/shop"
                className="inline-block mt-6 text-psy-green hover:text-bone transition-colors duration-[400ms]"
              >
                Browse all products
              </Link>
            </div>
          </FadeInOnScroll>
        )}
      </div>
    </main>
  )
}
