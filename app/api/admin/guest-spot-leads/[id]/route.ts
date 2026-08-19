import { NextRequest, NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase-server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("guest_spot_leads")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete guest spot lead";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
