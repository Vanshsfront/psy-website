import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    // Service client: the table has RLS enabled with no public read policy.
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("guest_artist_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch applications";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
