import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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

    const { data: collections, error } = await supabase
      .from("collections")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    // Get product counts for each collection
    const { data: counts, error: countError } = await supabase
      .from("collection_products")
      .select("collection_id");

    if (countError) throw new Error(countError.message);

    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) {
      countMap[row.collection_id] = (countMap[row.collection_id] || 0) + 1;
    }

    const result = (collections ?? []).map((c) => ({
      ...c,
      product_count: countMap[c.id] || 0,
    }));

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch collections";
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

    const { product_ids, ...collectionData } = body;

    // Auto-generate slug from name if not provided
    if (!collectionData.slug && collectionData.name) {
      collectionData.slug = collectionData.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    // Ensure slug uniqueness
    let uniqueSlug = collectionData.slug;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from("collections")
        .select("id")
        .eq("slug", uniqueSlug)
        .maybeSingle();

      if (!existing) break;
      uniqueSlug = `${collectionData.slug}-${counter}`;
      counter++;
    }

    collectionData.slug = uniqueSlug;

    const { data, error } = await supabase
      .from("collections")
      .insert(collectionData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Insert product associations if provided
    if (product_ids && product_ids.length > 0) {
      const rows = product_ids.map((productId: string, index: number) => ({
        collection_id: data.id,
        product_id: productId,
        sort_order: index,
      }));

      const { error: linkError } = await supabase
        .from("collection_products")
        .insert(rows);

      if (linkError) throw new Error(linkError.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create collection";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
