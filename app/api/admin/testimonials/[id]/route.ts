import { NextRequest, NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("customer_testimonials")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update testimonial";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

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
      .from("customer_testimonials")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete testimonial";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
