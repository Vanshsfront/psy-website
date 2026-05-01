import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "slug",
  "title",
  "excerpt",
  "content",
  "cover_image_url",
  "author",
  "is_published",
  "published_at",
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message, code: 500 }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found", code: 404 }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) patch[k] = v;
    }

    if (patch.is_published === true && !patch.published_at) {
      const { data: existing } = await supabase
        .from("blog_posts")
        .select("published_at")
        .eq("id", params.id)
        .maybeSingle();
      if (!existing?.published_at) {
        patch.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(patch)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update post";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message, code: 500 }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
