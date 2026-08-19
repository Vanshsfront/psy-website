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

/**
 * A refusal to authenticate or authorise, as opposed to anything else going
 * wrong.
 *
 * This exists because the two were previously indistinguishable. Every failure
 * reaching authErrorResponse was reported as 401, so a database error, a typo
 * in a query or a missing table all arrived at the browser as "Unauthorized" on
 * a perfectly valid session. That is not a cosmetic problem: the client treats
 * 401 as a dead session, wipes the token and bounces you to the login screen,
 * so a server-side fault logged people out and told them nothing.
 *
 * It cost real time on the 2026-08-19 deploy, where a missing GRANT on
 * studio.manual_entries surfaced as 401 on the salary and balance sheet screens
 * and looked for all the world like a role bug.
 */
export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message?: string) {
    super(message ?? (status === 403 ? "Forbidden" : "Unauthorized"));
    this.name = "AuthError";
    this.status = status;
  }
}

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
  if (!token) throw new AuthError(401);

  const payload = await decodeToken(token);
  if (!payload?.sub) throw new AuthError(401);

  const { getUserByUsername } = await import("./database");
  const user = await getUserByUsername(payload.sub);
  if (!user || user.is_active === false) throw new AuthError(401);

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
  if (!allowed.includes(user.role)) throw new AuthError(403);
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
    throw new AuthError(403);
  }

  // null means the route authenticates itself and must not be role-gated.
  if (allowed === null) {
    return getAuthedUser(request);
  }

  const user = await getAuthedUser(request);
  if (!allowed.includes(user.role)) throw new AuthError(403);
  return user;
}

/** Back-compat shim: existing routes call this and only need the username. */
export async function authenticateRequest(request: NextRequest): Promise<string> {
  const user = await getAuthedUser(request);
  return user.username;
}

/**
 * Turn a thrown error into a status.
 *
 * Only an AuthError produces 401 or 403. Everything else is a fault on our side
 * and gets 500, which is both honest and the difference between "sign in again"
 * and "this is broken, tell somebody".
 *
 * The message of a non-auth error is deliberately not returned to the caller:
 * database errors quote table and column names. It is logged instead, so the
 * detail lands somewhere a developer can read it and nowhere else.
 */
export function authErrorResponse(e: unknown): { detail: string; status: number } {
  if (e instanceof AuthError) {
    return e.status === 403
      ? { detail: "You do not have access to this", status: 403 }
      : { detail: "Unauthorized", status: 401 };
  }

  // Kept for anything that still throws the bare strings rather than an
  // AuthError, so a missed call site degrades to the old behaviour instead of
  // reporting a genuine auth failure as a server fault.
  if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden")) {
    return e.message === "Forbidden"
      ? { detail: "You do not have access to this", status: 403 }
      : { detail: "Unauthorized", status: 401 };
  }

  console.error("storeadmin route failed:", e);
  return { detail: "Something went wrong on our end", status: 500 };
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
