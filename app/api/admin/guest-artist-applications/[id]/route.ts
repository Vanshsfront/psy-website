import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// PATCH: { action: "approve" | "reject" }
// approve -> create a DRAFT guest_spot from the application + link it; status=approved
// reject  -> status=rejected
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const action = body?.action;

    const { data: app, error: fetchErr } = await supabase
      .from("guest_artist_applications")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchErr || !app) {
      return NextResponse.json({ error: "Application not found", code: 404 }, { status: 404 });
    }

    if (action === "reject") {
      const { data, error } = await supabase
        .from("guest_artist_applications")
        .update({ status: "rejected" })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }

    if (action === "approve") {
      // Only create a guest spot once.
      let guestSpotId = app.guest_spot_id as string | null;
      if (!guestSpotId) {
        const link = (app.portfolio_link as string | null) || "";
        const looksLikeInstagram = /instagram\.com/i.test(link);
        const bioParts = [
          app.type_of_artist,
          app.years_experience != null ? `${app.years_experience} yrs experience` : null,
          link || null,
        ].filter(Boolean);

        const { data: spot, error: spotErr } = await supabase
          .from("guest_spots")
          .insert({
            artist_name: `${app.first_name} ${app.last_name}`.trim(),
            bio: bioParts.length ? bioParts.join(" · ") : null,
            instagram: looksLikeInstagram ? link : null,
            portfolio_images: app.images || [],
            is_published: false, // draft — admin reviews/publishes in Guest Spots
          })
          .select()
          .single();

        if (spotErr) throw new Error(spotErr.message);
        guestSpotId = spot.id;
      }

      const { data, error } = await supabase
        .from("guest_artist_applications")
        .update({ status: "approved", guest_spot_id: guestSpotId })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown action", code: 400 }, { status: 400 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update application";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
