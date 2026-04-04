import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getArtists } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const artists = await getArtists();
    return NextResponse.json({ artists });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
