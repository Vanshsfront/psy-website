"use client"

import { useCartStore } from "@/store/cartStore"
import Link from "next/link"
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"

export default function CartPage() {
  const { items, removeItem, updateQuantity, getCartTotal } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const subtotal = getCartTotal()
  const shipping = subtotal > 999 ? 0 : 99
  const total = subtotal > 0 ? subtotal + shipping : 0

  return (
    <main className="max-w-7xl mx-auto px-6 py-24 min-h-screen pt-28">
      <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-4">
        Shopping
      </span>
      <h1 className="font-display font-light text-display-xl text-bone mb-16">
        Your Cart
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-32">
          <p className="font-display italic text-taupe text-body-lg mb-8">
            Nothing here yet.
          </p>
          <Link href="/shop">
            <button className="border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-3 px-8 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] cursor-pointer">
              Explore Collection
            </button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Cart Items */}
          <div className="lg:w-2/3 space-y-0">
            {items.map((item, idx) => (
              <div key={`${item.product_id}-${idx}`}>
                {/* Divider */}
                {idx === 0 && <div className="h-[1px] bg-taupe/20" />}

                <div className="flex gap-6 py-8">
                  <Link
                    href={`/shop/${item.slug}`}
                    className="block w-20 md:w-24 aspect-square flex-shrink-0 overflow-hidden"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link href={`/shop/${item.slug}`}>
                          <h3 className="font-display text-body-lg text-bone hover:text-taupe transition-colors duration-[400ms]">
                            {item.name}
                          </h3>
                        </Link>
                        {item.variant && (
                          <p className="font-sans text-micro text-taupe mt-1">
                            {Object.values(item.variant).join(" / ")}
                          </p>
                        )}
                      </div>
                      <span className="font-sans text-body text-bone">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-0">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product_id,
                              item.variant,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="p-2 text-taupe hover:text-bone transition-colors duration-[400ms] cursor-pointer"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-sans text-caption text-bone">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product_id,
                              item.variant,
                              item.quantity + 1
                            )
                          }
                          className="p-2 text-taupe hover:text-bone transition-colors duration-[400ms] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() =>
                          removeItem(item.product_id, item.variant)
                        }
                        className="text-taupe hover:text-bone transition-colors duration-[400ms] cursor-pointer"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-taupe/20" />
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-surface p-8 sticky top-24">
              <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-8">
                Order Summary
              </span>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between font-sans text-caption text-taupe">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-sans text-caption text-taupe">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="h-[1px] bg-taupe/20 mb-8" />

              <div className="flex justify-between font-sans text-body-lg text-bone mb-10">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>

              <Link href="/shop/checkout">
                <button className="w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-4 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] flex items-center justify-center gap-2 cursor-pointer">
                  Continue to Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <Link
                href="/shop"
                className="block text-center mt-6"
              >
                <span className="text-cta font-sans text-caption text-taupe">
                  Continue Shopping
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
