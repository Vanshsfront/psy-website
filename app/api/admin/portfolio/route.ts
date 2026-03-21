import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";

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
    const artist = searchParams.get("artist");
    const style = searchParams.get("style");

    let query = supabase
      .from("portfolio_items")
      .select("*, artists(name)")
      .order("created_at", { ascending: false });

    if (artist) {
      query = query.eq("artist_id", artist);
    }

    if (style && style !== "All") {
      query = query.eq("style_tag", style);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch portfolio";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Support batch insert (array of items)
    const items = Array.isArray(body) ? body : [body];

    const { data, error } = await supabase
      .from("portfolio_items")
      .insert(items)
      .select();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create portfolio item";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
