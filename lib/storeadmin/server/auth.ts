import { SignJWT, jwtVerify } from "jose";
import bcryptjs from "bcryptjs";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "psyshot-dev-secret-change-me"
);
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
    .sign(JWT_SECRET);
}

export async function decodeToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
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

export async function ensureDefaultUsers() {
  const { getUserByUsername, createUser } = await import("./database");

  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  if (!(await getUserByUsername(adminUser))) {
    await createUser(adminUser, hashPassword(adminPass));
  }

  if (!(await getUserByUsername("yogesh"))) {
    await createUser("yogesh", hashPassword("yogesh@admin"), "superadmin");
  }
}

/** @deprecated Use ensureDefaultUsers instead */
export const ensureAdminUser = ensureDefaultUsers;
