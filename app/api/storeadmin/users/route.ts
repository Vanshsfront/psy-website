import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse, hashPassword } from "@/lib/storeadmin/server/auth";
import { listUsers, createUser, getUserByUsername } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await requireRoute(request);
    const users = await listUsers();
    // Password hashes never leave the server, even for the owner.
    return NextResponse.json({ users });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRoute(request);
    const { username, password, role, artist_id } = await request.json();

    const name = String(username || "").trim().toLowerCase();
    if (!name) {
      return NextResponse.json({ detail: "Username is required" }, { status: 400 });
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json(
        { detail: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (!["superadmin", "admin", "artist"].includes(role)) {
      return NextResponse.json({ detail: "Invalid role" }, { status: 400 });
    }
    // The database enforces this too, but a clear message beats a constraint error.
    if (role === "artist" && !artist_id) {
      return NextResponse.json(
        { detail: "Pick which artist this login belongs to" },
        { status: 400 }
      );
    }
    if (await getUserByUsername(name)) {
      return NextResponse.json({ detail: "That username is taken" }, { status: 409 });
    }

    const user = await createUser(name, hashPassword(String(password)), role, artist_id ?? null);
    return NextResponse.json({ created: true, user: { ...user, password_hash: undefined } });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
