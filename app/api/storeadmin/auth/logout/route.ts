import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/storeadmin/server/auth";

/**
 * Clear the session cookie.
 *
 * Logging out used to be entirely client side: AuthProvider dropped the token
 * from localStorage and nothing told the server. That cannot clear an httpOnly
 * cookie, which by design the browser will not let script touch, so signing out
 * needs a round trip.
 *
 * Deliberately unauthenticated. Logging out an already-invalid session should
 * succeed quietly, not 401 and strand the cookie.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
