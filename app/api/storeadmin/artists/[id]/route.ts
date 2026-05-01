import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { updateArtist } from "@/lib/storeadmin/server/database";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const patch: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();

  if (!Object.keys(patch).length) {
    return NextResponse.json({ detail: "No editable fields" }, { status: 400 });
  }

  const artist = await updateArtist(params.id, patch);
  if (!artist) {
    return NextResponse.json({ detail: "Failed to update artist" }, { status: 500 });
  }
  return NextResponse.json({ updated: true, artist });
}
