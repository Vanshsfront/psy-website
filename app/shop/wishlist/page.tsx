"use client"

import { useWishlistStore } from "@/store/wishlistStore"
import { useCartStore } from "@/store/cartStore"
import Link from "next/link"
import { Trash2, ShoppingBag } from "lucide-react"
import { useEffect, useState } from "react"

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore()
  const { addItem: addCartItem } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const handleMoveToCart = (product: any) => {
    addCartItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: product.images[0] || "",
      variant: product.variants?.[0] || null,
      quantity: 1,
    })
    removeItem(product.id)
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 min-h-screen pt-28">
      <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-4">
        Saved
      </span>
      <h1 className="font-display font-light text-display-xl text-bone mb-16">
        Wishlist
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-32">
          <p className="font-display italic text-taupe text-body-lg mb-8">
            Nothing saved yet. Explore the collection.
          </p>
          <Link href="/shop">
            <button className="border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-3 px-8 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] cursor-pointer">
              View Collection
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
          {items.map((product) => (
            <div key={product.id} className="group flex flex-col relative">
              {/* Remove */}
              <button
                onClick={() => removeItem(product.id)}
                className="absolute top-4 right-4 z-20 text-bone/60 hover:text-bone transition-all duration-[400ms] opacity-0 group-hover:opacity-100 cursor-pointer"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <Link
                href={`/shop/${product.slug}`}
                className="flex-grow flex flex-col"
              >
                <div className="aspect-[4/5] overflow-hidden mb-4">
                  <img
                    src={
                      product.images[0] ||
                      "https://via.placeholder.com/400x500?text=No+Image"
                    }
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
                <h3 className="font-display text-body-lg text-bone mb-1 leading-tight">
                  {product.name}
                </h3>
                <span className="font-sans text-body text-taupe">
                  ₹{product.price}
                </span>
              </Link>

              <button
                onClick={() => handleMoveToCart(product)}
                className="mt-4 w-full border border-taupe/30 bg-transparent text-taupe uppercase tracking-widest text-micro py-3 rounded-[2px] hover:border-bone hover:text-bone transition-all duration-[400ms] flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-3 h-3" />
                Move to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
