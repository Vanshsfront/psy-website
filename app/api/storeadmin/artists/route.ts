import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getArtists } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const includeInactive = request.nextUrl.searchParams.get("include_inactive") === "true";
    const artists = await getArtists(!includeInactive);
    return NextResponse.json({ artists });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
