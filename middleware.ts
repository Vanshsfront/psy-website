import NextAuth from "next-auth"
import authConfig from "./auth.config"

export default NextAuth(authConfig).auth

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude storeadmin routes (they use their own JWT auth, not NextAuth)
  matcher: ['/((?!api|_next/static|_next/image|storeadmin|.*\\.png$).*)'],
}
