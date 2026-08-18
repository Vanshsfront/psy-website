import { SignJWT, jwtVerify } from "jose";
import bcryptjs from "bcryptjs";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

/**
 * Signing key for shop customer sessions.
 *
 * The literal that used to sit at the end of this chain never took effect in
 * production — NEXTAUTH_SECRET is set, so it always won — but it was one unset
 * variable away from letting anyone who read this public repository forge a
 * customer session. Same reasoning as lib/storeadmin/server/auth.ts: no default,
 * and read lazily so `next build` does not require the value.
 */
function jwtSecret(): Uint8Array {
  const secret = process.env.SHOP_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SHOP_JWT_SECRET (or NEXTAUTH_SECRET) must be set to at least 32 characters — customer sessions cannot be signed without it"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createCustomerToken(
  customerId: string,
  email: string
): Promise<string> {
  return new SignJWT({ sub: customerId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(jwtSecret());
}

export async function verifyCustomerToken(
  token: string
): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
    });
    return payload as { sub: string; email: string };
  } catch {
    return null;
  }
}

export async function getCustomerFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = await verifyCustomerToken(token);
  if (!payload?.sub) {
    return null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_customers")
    .select("id, email, name, phone, created_at, updated_at")
    .eq("id", payload.sub)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, bcryptjs.genSaltSync(10));
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcryptjs.compareSync(password, hash);
}
