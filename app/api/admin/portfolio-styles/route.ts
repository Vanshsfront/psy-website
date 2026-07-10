import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    const supabase = await createSSRClient();
    const { data, error } = await supabase
      .from("portfolio_styles")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch styles";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required", code: 400 }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("portfolio_styles")
      .insert({ name, sort_order: typeof body?.sort_order === "number" ? body.sort_order : 0 })
      .select()
      .single();

    if (error) {
      // Unique violation → friendly message
      if (error.code === "23505") {
        return NextResponse.json({ error: "That style already exists", code: 409 }, { status: 409 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create style";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
