import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { deleteDailyNote } from "@/lib/storeadmin/server/database";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const ok = await deleteDailyNote(params.id);
  if (!ok) {
    return NextResponse.json({ detail: "Failed to delete" }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
