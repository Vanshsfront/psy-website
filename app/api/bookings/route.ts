import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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

    const {
      name,
      email,
      phone,
      artist_id,
      inquiry_type,
      description,
      preferred_date,
      reference_image_url,
    } = body;

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        name,
        email,
        phone: phone || null,
        artist_id: artist_id || null,
        style: inquiry_type || null,
        description: description || null,
        preferred_date: preferred_date || null,
        reference_image_url: reference_image_url || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit booking";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
