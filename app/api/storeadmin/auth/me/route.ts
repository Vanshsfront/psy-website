import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/storeadmin/server/auth";

export async function GET(request: NextRequest) {
  try {
    const me = await getAuthedUser(request);
    // Resolved from the database on every call, not read out of the token, so a
    // demoted or deactivated user loses access immediately rather than when
    // their 24h token happens to expire.
    return NextResponse.json({
      username: me.username,
      role: me.role,
      artist_id: me.artistId,
    });
  } catch {
    return NextResponse.json({ detail: "Invalid or expired token" }, { status: 401 });
  }
}
