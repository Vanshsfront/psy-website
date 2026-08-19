import { NextRequest, NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("discounts")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update discount";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const supabase = createServiceClient();

    // Soft delete by setting is_active = false
    const { data, error } = await supabase
      .from("discounts")
      .update({ is_active: false })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete discount";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
