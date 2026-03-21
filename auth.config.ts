import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { createServiceClient } from "./lib/supabase-server"
import bcrypt from "bcryptjs"

export default {
  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const supabase = createServiceClient()
        
        // Lookup admin user
        const { data: user, error } = await supabase
          .from("admin_users")
          .select("*")
          .eq("username", credentials.username)
          .single()

        if (error || !user) {
          console.error("Admin user not found")
          return null
        }

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )

        if (passwordsMatch) {
          return { id: user.id, name: user.username }
        }
        
        return null
      }
    })
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAdmin = nextUrl.pathname.startsWith('/admin')
      const isLoginPage = nextUrl.pathname === '/admin/login'

      if (isOnAdmin && !isLoginPage) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL('/admin', nextUrl))
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 }, // 24 hours
} satisfies NextAuthConfig
