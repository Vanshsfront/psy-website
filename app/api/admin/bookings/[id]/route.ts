import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const supabase = await createSSRClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, artists(name)")
      .eq("id", params.id)
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch booking";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields: Record<string, unknown> = {};
    if (body.status !== undefined) allowedFields.status = body.status;
    if (body.admin_notes !== undefined) allowedFields.admin_notes = body.admin_notes;

    const { data, error } = await supabase
      .from("bookings")
      .update(allowedFields)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update booking";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
