"use client"

import { useState, useEffect } from "react"
import { useCartStore } from "@/store/cartStore"
import { useCustomerStore } from "@/store/customerStore"
import { useForm } from "react-hook-form"
import Link from "next/link"
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
  const { items, getCartTotal, clearCart, discountCode, discountAmount } = useCartStore()
  const { customer, token } = useCustomerStore()
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
    setValue,
    formState: { errors },
  } = useForm<ShippingData>({
    resolver: zodResolver(shippingSchema),
  })

  useEffect(() => {
    if (customer) {
      setValue("name", customer.name)
      setValue("email", customer.email)
      if (customer.phone) setValue("phone", customer.phone)
    }
  }, [customer, setValue])

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
  const discountedSubtotal = subtotal - discountAmount
  const shippingCharge = discountedSubtotal > 999 ? 0 : 99
  const total = discountedSubtotal + shippingCharge

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
          discountCode,
          customerId: customer?.id || null,
        }),
      })
      const result = await response.json()

      if (!response.ok)
        throw new Error(result.error || "Failed to create order")

      // If Razorpay is not configured yet, redirect directly to confirmation
      if (result.paymentMode === "manual") {
        clearCart()
        router.push(`/shop/order-confirmed/${result.dbOrderId}`)
        return
      }

      // Razorpay payment flow
      if (!window.Razorpay) {
        throw new Error("Payment system is loading. Please try again.")
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: result.amount,
        currency: "INR",
        name: "PSY",
        description: `Order ${result.orderNumber}`,
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
        alert("Payment failed. Please try again.")
      })
      rzp.open()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-16 border-t border-taupe/20 pt-12">
      {/* Checkout Form */}
      <div className="lg:w-2/3">
        {customer ? (
          <div className="flex items-center gap-2 text-psy-green text-caption mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Logged in as {customer.name}</span>
          </div>
        ) : (
          <div className="mb-6">
            <Link
              href="/shop/account/login"
              className="font-sans text-cta text-taupe hover:text-bone transition-colors duration-300"
            >
              Have an account? Log in for faster checkout
            </Link>
          </div>
        )}

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
            {discountAmount > 0 && (
              <div className="flex justify-between font-sans text-caption">
                <span className="text-taupe">Discount ({discountCode})</span>
                <span className="text-psy-green">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
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
