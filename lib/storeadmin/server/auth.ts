import { SignJWT, jwtVerify } from "jose";
import bcryptjs from "bcryptjs";
import { NextRequest } from "next/server";
import { accessForPath, type UserRole } from "@/lib/auth/permissions";

/**
 * The signing key for every /storeadmin session.
 *
 * This used to fall back to a literal written in this file. That file is in a
 * public repository and JWT_SECRET was never set in production, so the studio
 * ran for weeks signing superadmin sessions with a key anyone could read.
 * Three lines of jose were enough to mint a valid `yogesh` token against
 * psyonline.in. There is no safe default for a signing key, so there is no
 * default: an unset JWT_SECRET now fails the request loudly.
 *
 * Read lazily rather than at module load so `next build`, which imports every
 * route handler, does not need the secret present to produce a build.
 */
function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set to at least 32 characters. /storeadmin sessions cannot be signed without it"
    );
  }
  return new TextEncoder().encode(secret);
}

const JWT_EXPIRE_HOURS = 24;

/**
 * Name of the cookie carrying the session.
 *
 * The session used to live only in localStorage, which has two costs: any XSS
 * bug can read it, and nothing on the server can see it. The second is what
 * blocks the /admin merge, because a Server Component cannot read localStorage
 * and every page under app/admin is one. An httpOnly cookie fixes both.
 */
export const SESSION_COOKIE = "psyshot_session";

/** Cookie attributes for the session. Shared by the login and logout routes. */
export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    // Off in local dev, where there is no TLS and the cookie would be dropped.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: JWT_EXPIRE_HOURS * 60 * 60,
  };
}

// Declared once, in lib/auth/permissions.ts, and re-exported here so the many
// existing importers of this module keep working.
export type { UserRole };

/** Who the caller is, resolved from the database rather than from the token. */
export interface AuthedUser {
  username: string;
  role: UserRole;
  /** Set only for `artist` logins: the studio.artists row they speak for. */
  artistId: string | null;
}

export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, bcryptjs.genSaltSync(10));
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcryptjs.compareSync(plain, hashed);
}

export async function createToken(username: string): Promise<string> {
  // Deliberately carries no role. Roles live in the database, so revoking or
  // demoting someone takes effect immediately instead of waiting out a token
  // that still asserts the old privileges.
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${JWT_EXPIRE_HOURS}h`)
    .sign(jwtSecret());
}

export async function decodeToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ["HS256"] });
    return payload as { sub: string };
  } catch {
    return null;
  }
}

/**
 * Pull the raw JWT off a request.
 *
 * Cookie first, then the Authorization header. Both are accepted on purpose:
 * the cookie is where sessions are heading, and the header is what every
 * already-loaded browser tab is still sending. Dropping the header would sign
 * out everyone mid-deploy for no benefit.
 */
function tokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  return null;
}

/** Look the caller up. Throws "Unauthorized" for a bad token or disabled account. */
export async function getAuthedUser(request: NextRequest): Promise<AuthedUser> {
  const token = tokenFromRequest(request);
  if (!token) throw new Error("Unauthorized");

  const payload = await decodeToken(token);
  if (!payload?.sub) throw new Error("Unauthorized");

  const { getUserByUsername } = await import("./database");
  const user = await getUserByUsername(payload.sub);
  if (!user || user.is_active === false) throw new Error("Unauthorized");

  return {
    username: user.username,
    role: (user.role as UserRole) || "admin",
    artistId: (user.artist_id as string) ?? null,
  };
}

/**
 * Gate a route on one or more roles.
 *
 * Every /api/storeadmin route should call this rather than merely authenticating:
 * hiding a sidebar item stops nobody from calling the endpoint directly, which
 * is exactly how an artist login would otherwise read the whole studio's
 * customer list and finances.
 */
export async function requireRole(
  request: NextRequest,
  ...allowed: UserRole[]
): Promise<AuthedUser> {
  const user = await getAuthedUser(request);
  if (!allowed.includes(user.role)) throw new Error("Forbidden");
  return user;
}

/**
 * Gate a route on the permission map rather than on roles written at the call
 * site. The path decides, so who may reach what lives in exactly one file.
 *
 * Unlisted paths are denied. A new route is unreachable until it is added to
 * API_ACCESS, which is the safe direction to fail: forgetting an entry breaks
 * the route loudly in testing instead of leaving it open in production.
 */
export async function requireRoute(request: NextRequest): Promise<AuthedUser> {
  const allowed = accessForPath(request.nextUrl.pathname, request.method);

  if (allowed === undefined) {
    throw new Error("Forbidden");
  }

  // null means the route authenticates itself and must not be role-gated.
  if (allowed === null) {
    return getAuthedUser(request);
  }

  const user = await getAuthedUser(request);
  if (!allowed.includes(user.role)) throw new Error("Forbidden");
  return user;
}

/** Back-compat shim: existing routes call this and only need the username. */
export async function authenticateRequest(request: NextRequest): Promise<string> {
  const user = await getAuthedUser(request);
  return user.username;
}

/** Maps a thrown auth error to the right status, so 403 stops reading as 401. */
export function authErrorResponse(e: unknown): { detail: string; status: number } {
  const message = e instanceof Error ? e.message : "Unauthorized";
  if (message === "Forbidden") {
    return { detail: "You do not have access to this", status: 403 };
  }
  return { detail: "Unauthorized", status: 401 };
}

/**
 * Create the owner account on a fresh install, and only then.
 *
 * This used to seed two accounts with passwords written directly in this file
 * ("admin123" and one for yogesh). Those literals sit in a public repository and
 * /storeadmin is reachable from the open internet, so anyone who read the source
 * could sign in as superadmin. Seeding now requires STOREADMIN_BOOTSTRAP_PASSWORD
 * to be set explicitly; with no value there is simply no account to guess.
 */
export async function ensureDefaultUsers() {
  const { getUserByUsername, createUser } = await import("./database");

  const owner = process.env.ADMIN_USERNAME || "yogesh";
  const bootstrap = process.env.STOREADMIN_BOOTSTRAP_PASSWORD;

  if (await getUserByUsername(owner)) return;
  if (!bootstrap || bootstrap.length < 12) {
    // Silent no-op rather than a throw: login must still return "invalid
    // credentials" for an unknown user instead of leaking that the studio has
    // not been set up yet.
    return;
  }
  await createUser(owner, hashPassword(bootstrap), "superadmin");
}

/** @deprecated Use ensureDefaultUsers instead */
export const ensureAdminUser = ensureDefaultUsers;
