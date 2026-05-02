import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";

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
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let bookingsQuery = supabase
      .from("bookings")
      .select("*, artists(name)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      bookingsQuery = bookingsQuery.eq("status", status);
    }
    if (search) {
      bookingsQuery = bookingsQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const [{ data: bookings, error: bErr }, { data: leads, error: lErr }] = await Promise.all([
      bookingsQuery,
      supabase
        .from("guest_spot_leads")
        .select("*, guest_spots(artist_name)")
        .order("created_at", { ascending: false }),
    ]);

    if (bErr) throw new Error(bErr.message);
    if (lErr) throw new Error(lErr.message);

    type LeadRow = {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      message: string | null;
      guest_spot_id: string | null;
      created_at: string;
      guest_spots?: { artist_name: string } | null;
    };

    let mappedLeads = ((leads as LeadRow[]) ?? []).map((l) => ({
      id: `gsl-${l.id}`,
      name: l.name,
      email: l.email,
      phone: l.phone,
      artist_id: null,
      inquiry_type: "Guest Artist",
      style: l.guest_spots?.artist_name ? `Guest: ${l.guest_spots.artist_name}` : "Guest Artist",
      description: l.message,
      preferred_date: null,
      reference_image_url: null,
      status: "pending",
      admin_notes: null,
      created_at: l.created_at,
      artists: l.guest_spots?.artist_name ? { name: l.guest_spots.artist_name } : null,
      guest_spot_id: l.guest_spot_id,
      _source: "guest_spot_lead" as const,
    }));

    if (status && status !== "all" && status !== "pending") {
      mappedLeads = [];
    }
    if (search) {
      const q = search.toLowerCase();
      mappedLeads = mappedLeads.filter(
        (l) => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)
      );
    }

    const merged = [...((bookings as unknown[]) ?? []), ...mappedLeads].sort((a, b) => {
      const ad = new Date((a as { created_at: string }).created_at).getTime();
      const bd = new Date((b as { created_at: string }).created_at).getTime();
      return bd - ad;
    });

    return NextResponse.json(merged);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch bookings";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
