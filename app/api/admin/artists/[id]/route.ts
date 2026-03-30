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
      .from("artists")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch artist";
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

    const { data, error } = await supabase
      .from("artists")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update artist";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function DELETE(
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

    // Delete the artist — portfolio items artist_id will be set to NULL (ON DELETE SET NULL)
    const { error } = await supabase
      .from("artists")
      .delete()
      .eq("id", params.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete artist";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
