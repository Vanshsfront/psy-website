import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createToken, ensureDefaultUsers } from "@/lib/storeadmin/server/auth";
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
    return NextResponse.json({ token, username, role: user.role ?? "admin" });
  } catch (e) {
    return NextResponse.json({ detail: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
