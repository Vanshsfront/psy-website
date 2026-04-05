import { createSSRClient } from "@/lib/supabase-server"
import Link from "next/link"
import Image from "next/image"
import FadeInOnScroll from "@/components/animations/FadeInOnScroll"

export const revalidate = 60

export default async function CollectionsPage() {
  const supabase = await createSSRClient()

  const { data: collections } = await supabase
    .from("collections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  // Get product counts for each collection
  const collectionsWithCounts = await Promise.all(
    (collections || []).map(async (collection) => {
      const { count } = await supabase
        .from("collection_products")
        .select("*", { count: "exact", head: true })
        .eq("collection_id", collection.id)

      return { ...collection, product_count: count || 0 }
    })
  )

  return (
    <main className="min-h-screen bg-ink pt-28 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <FadeInOnScroll>
          <div className="text-center mb-16">
            <h1 className="font-display text-display-xl text-bone mb-4">
              Collections
            </h1>
            <p className="text-taupe text-body-lg max-w-2xl mx-auto">
              Browse our curated collections of tattoo-inspired merchandise and
              accessories.
            </p>
          </div>
        </FadeInOnScroll>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {collectionsWithCounts.map((collection, index) => (
            <FadeInOnScroll key={collection.id} delay={index * 0.1}>
              <Link
                href={`/shop/collections/${collection.slug}`}
                className="group block rounded-xl overflow-hidden border border-bone/5 hover:border-bone/10 transition-all duration-[400ms]"
              >
                {/* Image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-surface">
                  {collection.image_url ? (
                    <Image
                      src={collection.image_url}
                      alt={collection.name}
                      fill
                      className="object-cover transition-transform duration-[400ms] group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-psy-green/20 via-surface to-ink" />
                  )}
                </div>

                {/* Info */}
                <div className="p-5 bg-surface">
                  <h2 className="font-display text-body-lg text-bone mb-1">
                    {collection.name}
                  </h2>
                  <p className="text-caption text-taupe">
                    {collection.product_count}{" "}
                    {collection.product_count === 1 ? "product" : "products"}
                  </p>
                </div>
              </Link>
            </FadeInOnScroll>
          ))}
        </div>

        {/* Empty state */}
        {collectionsWithCounts.length === 0 && (
          <FadeInOnScroll>
            <p className="text-center text-taupe text-body-lg mt-12">
              No collections available at the moment.
            </p>
          </FadeInOnScroll>
        )}
      </div>
    </main>
  )
}
