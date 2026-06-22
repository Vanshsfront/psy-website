import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const first_name =
      typeof body.first_name === "string" ? body.first_name.trim() : "";
    const last_name =
      typeof body.last_name === "string" ? body.last_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "First name, last name and email are required", code: 400 },
        { status: 400 }
      );
    }

    const images = Array.isArray(body.images)
      ? body.images.filter((u: unknown) => typeof u === "string")
      : [];

    const years_experience =
      body.years_experience === "" || body.years_experience == null
        ? null
        : Number(body.years_experience);

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("guest_artist_applications")
      .insert({
        first_name,
        last_name,
        email,
        phone: body.phone?.trim() || null,
        type_of_artist: body.type_of_artist?.trim() || null,
        years_experience:
          Number.isFinite(years_experience) ? years_experience : null,
        portfolio_link: body.portfolio_link?.trim() || null,
        images,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit application";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
