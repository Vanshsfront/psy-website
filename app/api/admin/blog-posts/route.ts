import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch posts";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required", code: 400 },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const slug = (body.slug && body.slug.trim()) || slugify(body.title);

    const payload = {
      slug,
      title: body.title,
      excerpt: body.excerpt ?? null,
      content: body.content,
      cover_image_url: body.cover_image_url ?? null,
      author: body.author ?? null,
      is_published: !!body.is_published,
      published_at: body.is_published
        ? body.published_at ?? new Date().toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("blog_posts")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create post";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
