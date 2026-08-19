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
      .from("product_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch categories";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { name, slug, sort_order } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required", code: 400 },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("product_categories")
      .insert({ name, slug, sort_order: sort_order || 0 })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create category";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
