import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { accessForPath } from "@/lib/auth/permissions";

/**
 * Gate for the shop and website API routes under /api/admin.
 *
 * Returns a response to send when the caller is not allowed, or null to carry
 * on. That shape mirrors the early-return guard these routes already had:
 *
 *   const session = await auth();
 *   if (!session?.user) return NextResponse.json({ error: "Unauthorized", ... });
 *
 * The response body keeps the original `{ error, code }` shape so existing
 * client error handling is unaffected.
 *
 * It reads the cookie rather than taking a NextRequest because six of these
 * handlers are declared as `GET()` with no parameter. Which roles are allowed
 * still comes from the permission map, so this is not a second opinion about
 * access, only a second way of asking the same question.
 */
export async function guardAdminApi(): Promise<NextResponse | null> {
  const allowed = accessForPath("/api/admin");

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  if (allowed && !allowed.includes(user.role)) {
    return NextResponse.json({ error: "You do not have access to this", code: 403 }, { status: 403 });
  }

  return null;
}
