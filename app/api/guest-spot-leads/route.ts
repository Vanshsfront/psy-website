import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Name and email are required", code: 400 },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { name, email, phone, message, guest_spot_id } = body;

    const { data, error } = await supabase
      .from("guest_spot_leads")
      .insert({
        name,
        email,
        phone: phone || null,
        message: message || null,
        guest_spot_id: guest_spot_id || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit guest spot lead";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
