import { SignJWT, jwtVerify } from "jose";
import bcryptjs from "bcryptjs";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "psyshot-dev-secret-change-me"
);
const JWT_EXPIRE_HOURS = 24;

export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, bcryptjs.genSaltSync(10));
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcryptjs.compareSync(plain, hashed);
}

export async function createToken(username: string): Promise<string> {
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

export async function authenticateRequest(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice(7);
  const payload = await decodeToken(token);
  if (!payload?.sub) {
    throw new Error("Unauthorized");
  }
  return payload.sub;
}

export async function ensureAdminUser() {
  const { getUserByUsername, createUser } = await import("./database");
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const existing = await getUserByUsername(adminUser);
  if (!existing) {
    await createUser(adminUser, hashPassword(adminPass));
  }
}
