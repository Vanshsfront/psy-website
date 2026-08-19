import { NextRequest, NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/guard";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const supabase = await createSSRClient();

    const { data, error } = await supabase
      .from("customer_testimonials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch testimonials";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("customer_testimonials")
      .insert(body)
      .select();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create testimonial";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
