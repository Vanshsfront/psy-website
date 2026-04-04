import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const supabase = await createSSRClient();
    const { searchParams } = new URL(request.url);
    const guestSpotId = searchParams.get("guest_spot_id");

    let query = supabase
      .from("guest_spot_leads")
      .select("*, guest_spots(artist_name)")
      .order("created_at", { ascending: false });

    if (guestSpotId) {
      query = query.eq("guest_spot_id", guestSpotId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch guest spot leads";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
