import { NextRequest, NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/guard";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("*");

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch site settings";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: "Key and value are required", code: 400 },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update site settings";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
