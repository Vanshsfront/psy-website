"use client"

import { useState, useEffect } from "react"
import { useCartStore } from "@/store/cartStore"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

declare global {
  interface Window {
    Razorpay: any
  }
}

const shippingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  address: z.string().min(10, "Full address required"),
  city: z.string().min(2, "City required"),
  state: z.string().min(2, "State required"),
  pincode: z.string().min(6, "Valid pincode required"),
})

type ShippingData = z.infer<typeof shippingSchema>

export default function CheckoutClient() {
  const { items, getCartTotal, clearCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingData>({
    resolver: zodResolver(shippingSchema),
  })

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="font-display italic text-taupe text-body-lg mb-8">
          Nothing to checkout.
        </p>
        <button
          onClick={() => router.push("/shop")}
          className="border border-taupe bg-transparent text-taupe uppercase tracking-widest text-caption py-3 px-8 rounded-[2px] hover:border-bone hover:text-bone transition-all duration-[400ms] cursor-pointer"
        >
          Back to Shop
        </button>
      </div>
    )
  }

  const subtotal = getCartTotal()
  const shippingCharge = subtotal > 999 ? 0 : 99
  const total = subtotal + shippingCharge

  const processPayment = async (data: ShippingData) => {
    setIsProcessing(true)
    try {
      const response = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: data,
          items,
          subtotal,
          shippingCharge,
          total,
        }),
      })
      const result = await response.json()

      if (!response.ok)
        throw new Error(result.error || "Failed to create order")

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: result.amount,
        currency: "INR",
        name: "PSY",
        description: "PSY Jewels Purchase",
        order_id: result.razorpayOrderId,
        handler: function (response: any) {
          clearCart()
          router.push(`/shop/order-confirmed/${result.dbOrderId}`)
        },
        prefill: {
          name: data.name,
          email: data.email,
          contact: data.phone,
        },
        theme: {
          color: "#3BA37C",
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", function (response: any) {
        console.error(response.error)
        alert("Something went quiet. Try again.")
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      alert("Something went quiet. Try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-16 border-t border-taupe/20 pt-12">
      {/* Checkout Form */}
      <div className="lg:w-2/3">
        <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-8">
          1. Shipping Details
        </span>
        <form
          id="checkout-form"
          onSubmit={handleSubmit(processPayment)}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                Full Name
              </label>
              <Input {...register("name")} placeholder="Full name" />
              {errors.name && (
                <p className="text-terracotta text-micro mt-2">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                Email
              </label>
              <Input
                {...register("email")}
                type="email"
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-terracotta text-micro mt-2">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
              Phone
            </label>
            <Input {...register("phone")} placeholder="+91 XXXXX XXXXX" />
            {errors.phone && (
              <p className="text-terracotta text-micro mt-2">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
              Full Address
            </label>
            <Input {...register("address")} placeholder="Street, area" />
            {errors.address && (
              <p className="text-terracotta text-micro mt-2">
                {errors.address.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                City
              </label>
              <Input {...register("city")} placeholder="City" />
              {errors.city && (
                <p className="text-terracotta text-micro mt-2">
                  {errors.city.message}
                </p>
              )}
            </div>
            <div>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                State
              </label>
              <Input {...register("state")} placeholder="State" />
              {errors.state && (
                <p className="text-terracotta text-micro mt-2">
                  {errors.state.message}
                </p>
              )}
            </div>
            <div>
              <label className="block font-sans text-micro uppercase tracking-widest text-taupe mb-3">
                Pincode
              </label>
              <Input {...register("pincode")} placeholder="123456" />
              {errors.pincode && (
                <p className="text-terracotta text-micro mt-2">
                  {errors.pincode.message}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Order Review */}
      <div className="lg:w-1/3">
        <span className="font-sans uppercase tracking-[0.3em] text-taupe text-micro block mb-8">
          2. Order Review
        </span>
        <div className="bg-surface p-8 sticky top-24">
          <div className="space-y-4 mb-8 max-h-60 overflow-y-auto hide-scrollbar pr-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-4 pb-4 border-b border-taupe/10 last:border-0"
              >
                <div className="w-14 h-16 overflow-hidden flex-shrink-0">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col flex-grow">
                  <span className="font-sans text-caption text-bone line-clamp-1">
                    {item.name}
                  </span>
                  <span className="font-sans text-micro text-taupe">
                    Qty: {item.quantity}
                  </span>
                  <span className="font-sans text-caption text-bone mt-auto">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-8 border-t border-taupe/20 pt-6">
            <div className="flex justify-between font-sans text-caption text-taupe">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-sans text-caption text-taupe">
              <span>Shipping</span>
              <span>
                {shippingCharge === 0
                  ? "FREE"
                  : `₹${shippingCharge.toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="h-[1px] bg-taupe/20 mb-8" />

          <div className="flex justify-between font-sans text-body-lg text-bone mb-10">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={isProcessing}
            className="w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-4 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
          </button>
          <div className="text-center mt-4 font-sans text-micro text-taupe">
            Secured by Razorpay
          </div>
        </div>
      </div>
    </div>
  )
}
