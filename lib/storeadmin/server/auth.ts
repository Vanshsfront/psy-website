import { SignJWT, jwtVerify } from "jose";
import bcryptjs from "bcryptjs";
import { NextRequest } from "next/server";

/**
 * The signing key for every /storeadmin session.
 *
 * This used to fall back to a literal written in this file. That file is in a
 * public repository and JWT_SECRET was never set in production, so the studio
 * ran for weeks signing superadmin sessions with a key anyone could read —
 * three lines of jose were enough to mint a valid `yogesh` token against
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
      "JWT_SECRET must be set to at least 32 characters — /storeadmin sessions cannot be signed without it"
    );
  }
  return new TextEncoder().encode(secret);
}

const JWT_EXPIRE_HOURS = 24;

export type UserRole = "superadmin" | "admin" | "artist";

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

/** Look the caller up. Throws "Unauthorized" for a bad token or disabled account. */
export async function getAuthedUser(request: NextRequest): Promise<AuthedUser> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const payload = await decodeToken(authHeader.slice(7));
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
 * Create the owner account on a fresh install — and only then.
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
