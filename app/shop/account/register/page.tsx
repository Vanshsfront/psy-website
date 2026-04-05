"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { useCustomerStore } from "@/store/customerStore"

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(1, "Phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth, isLoggedIn } = useCustomerStore()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    if (isLoggedIn()) {
      router.push("/shop/account")
    }
  }, [isLoggedIn, router])

  const onSubmit = async (data: RegisterForm) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/shop/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Registration failed. Please try again.")
        return
      }

      setAuth(json.token, json.customer)
      router.push("/shop/account")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-ink pt-28">
      <div className="max-w-md mx-auto px-6">
        <div className="mb-12">
          <h1 className="font-display text-display-lg text-bone mb-2">Create Account</h1>
          <p className="font-display italic text-taupe">Join the PSY community</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <label className="font-sans text-micro uppercase tracking-widest text-taupe mb-3 block">
              Name
            </label>
            <Input
              type="text"
              placeholder="Your full name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-terracotta text-caption mt-2">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="font-sans text-micro uppercase tracking-widest text-taupe mb-3 block">
              Email
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-terracotta text-caption mt-2">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="font-sans text-micro uppercase tracking-widest text-taupe mb-3 block">
              Phone
            </label>
            <Input
              type="tel"
              placeholder="Your phone number"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-terracotta text-caption mt-2">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="font-sans text-micro uppercase tracking-widest text-taupe mb-3 block">
              Password
            </label>
            <Input
              type="password"
              placeholder="Min. 8 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-terracotta text-caption mt-2">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="font-sans text-micro uppercase tracking-widest text-taupe mb-3 block">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Re-enter your password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-terracotta text-caption mt-2">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <p className="text-terracotta text-body">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-4 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-taupe text-body mt-10">
          Already have an account?{" "}
          <Link
            href="/shop/account/login"
            className="text-psy-green hover:text-bone transition-all duration-[400ms]"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}
