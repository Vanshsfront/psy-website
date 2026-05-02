import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getArtists, getArtistByName, createArtist } from "@/lib/storeadmin/server/database";

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

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ detail: "Artist name is required" }, { status: 400 });
  }

  const existing = await getArtistByName(name);
  if (existing) {
    return NextResponse.json({ detail: "An artist with that name already exists", artist: existing }, { status: 409 });
  }

  const artist = await createArtist(name);
  if (!artist || !("id" in artist)) {
    return NextResponse.json({ detail: "Failed to create artist" }, { status: 500 });
  }
  return NextResponse.json({ created: true, artist }, { status: 201 });
}
