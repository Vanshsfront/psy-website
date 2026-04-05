"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { useCustomerStore } from "@/store/customerStore"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, isLoggedIn } = useCustomerStore()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (isLoggedIn()) {
      router.push("/shop/account")
    }
  }, [isLoggedIn, router])

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/shop/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Invalid email or password")
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
          <h1 className="font-display text-display-lg text-bone mb-2">Login</h1>
          <p className="font-display italic text-taupe">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-terracotta text-caption mt-2">{errors.password.message}</p>
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
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-taupe text-body mt-10">
          Don&apos;t have an account?{" "}
          <Link
            href="/shop/account/register"
            className="text-psy-green hover:text-bone transition-all duration-[400ms]"
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}
