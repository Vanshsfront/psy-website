"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
      })

      if (res?.error) {
        setError("Invalid credentials")
      } else {
        router.push("/admin")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-borderDark p-8 rounded shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-borderDark rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-neon-cyan" />
          </div>
          <h1 className="font-display text-3xl font-bold">Admin Portal</h1>
          <p className="text-mutedText text-sm mt-2">Authorized personnel only.</p>
        </div>

        {error && (
          <div className="bg-danger/20 border border-danger text-danger p-3 rounded text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-mutedText">Username</label>
            <Input 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-mutedText">Password</label>
            <Input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
            />
          </div>
          <Button type="submit" variant="neon" className="w-full h-12 tracking-widest text-lg" disabled={loading}>
            {loading ? "AUTHENTICATING..." : "ACCESS"}
          </Button>
        </form>
      </div>
    </div>
  )
}
