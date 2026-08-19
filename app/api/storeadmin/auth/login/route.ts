import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createToken,
  ensureDefaultUsers,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/storeadmin/server/auth";
import { getUserByUsername } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultUsers();

    const { username, password } = await request.json();
    const user = await getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }
    // Deactivated accounts fail exactly like a wrong password, so the response
    // does not reveal which usernames exist.
    if (user.is_active === false) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }
    const token = await createToken(username);

    // The token still goes back in the body because existing clients read it
    // from there into localStorage. The cookie is what server components and
    // middleware can actually see, and being httpOnly it is the copy an XSS
    // bug cannot reach. Both carry the same JWT.
    const response = NextResponse.json({ token, username, role: user.role ?? "admin" });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (e) {
    return NextResponse.json({ detail: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
