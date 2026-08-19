import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/storeadmin/server/auth";
import type { UserRole } from "@/lib/auth/permissions";

/**
 * Reading the session from a Server Component or a server action.
 *
 * The API side already has getAuthedUser(request), but pages do not have a
 * NextRequest to hand. Both read the same cookie and both resolve the role from
 * the database rather than from the token, so a demoted account loses access on
 * its next request instead of when its 24h token happens to expire.
 */

export interface SessionUser {
  username: string;
  role: UserRole;
  artistId: string | null;
}

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

/** Resolve the signed-in user, or null. Never throws on a bad or absent session. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let username: string;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    username = payload.sub;
  } catch {
    return null;
  }

  const { getUserByUsername } = await import("@/lib/storeadmin/server/database");
  const user = await getUserByUsername(username);
  if (!user || user.is_active === false) return null;

  return {
    username: user.username,
    role: (user.role as UserRole) || "admin",
    artistId: (user.artist_id as string) ?? null,
  };
}

/**
 * Guard a page. Redirects to the login screen when there is no valid session.
 *
 * Every page under app/admin previously had no check of its own and depended
 * entirely on the middleware matcher. That works until the matcher is edited,
 * at which point pages silently become public while the API stays protected.
 * Calling this from the layout means the page is guarded by its own code.
 */
export async function requirePageSession(allowed?: readonly UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/storeadmin/login");
  if (allowed && !allowed.includes(user.role)) redirect("/storeadmin");
  return user;
}
