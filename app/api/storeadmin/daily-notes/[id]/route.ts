import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { deleteDailyNote } from "@/lib/storeadmin/server/database";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoute(request);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }

  const ok = await deleteDailyNote(params.id);
  if (!ok) {
    return NextResponse.json({ detail: "Failed to delete" }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
