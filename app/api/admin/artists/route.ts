import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";

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
    const search = searchParams.get("search");

    let query = supabase
      .from("artists")
      .select("*")
      .order("name", { ascending: true });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,speciality.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch artists";
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

    const { data, error } = await supabase
      .from("artists")
      .insert(body)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create artist";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
