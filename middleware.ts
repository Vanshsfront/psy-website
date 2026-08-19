import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

/**
 * Redirect signed-out visitors away from the admin panels.
 *
 * This used to be NextAuth's middleware, matched against every path on the
 * site except a short exclusion list, which meant a session cookie was decoded
 * on every public page view for the benefit of two panels.
 *
 * It now checks only the JWT signature and only on the panel routes. It
 * deliberately does not resolve the user or their role: that needs the
 * database, which is not available on the edge, and it is done properly by
 * requirePageSession on pages and by the permission map on API routes. This is
 * a redirect for humans, not the security boundary.
 */

const LOGIN_PATH = "/storeadmin/login"

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("psyshot_session")?.value
  if (!token) return false

  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) return false

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] })
    return true
  } catch {
    return false
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The login screen has to stay reachable, or signing in is impossible.
  if (pathname === LOGIN_PATH) {
    if (await hasValidSession(request)) {
      return NextResponse.redirect(new URL("/storeadmin", request.nextUrl))
    }
    return NextResponse.next()
  }

  if (await hasValidSession(request)) return NextResponse.next()

  // Built from the request's own origin. Using a configured base URL here once
  // sent production traffic to localhost.
  return NextResponse.redirect(new URL(LOGIN_PATH, request.nextUrl))
}

export const config = {
  // Only the two panels. The public site and the shop are not gated, and no
  // longer pay for a session decode on every request.
  matcher: ["/admin/:path*", "/storeadmin/:path*"],
}
