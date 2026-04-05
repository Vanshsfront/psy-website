import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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
    const { id } = params;

    const { data: collection, error } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    // Get products for this collection
    const { data: collectionProducts, error: cpError } = await supabase
      .from("collection_products")
      .select(
        "sort_order, product_id, products(id, name, slug, images, price)"
      )
      .eq("collection_id", id)
      .order("sort_order", { ascending: true });

    if (cpError) throw new Error(cpError.message);

    const products = (collectionProducts ?? []).map((cp: any) => ({
      ...cp.products,
      sort_order: cp.sort_order,
    }));

    return NextResponse.json({ ...collection, products });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch collection";
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
    const { id } = params;
    const body = await request.json();

    const { product_ids, ...collectionData } = body;

    // Update collection fields if any provided
    if (Object.keys(collectionData).length > 0) {
      const { error } = await supabase
        .from("collections")
        .update(collectionData)
        .eq("id", id);

      if (error) throw new Error(error.message);
    }

    // Replace product associations if product_ids is provided
    if (product_ids !== undefined) {
      // Remove existing associations
      const { error: deleteError } = await supabase
        .from("collection_products")
        .delete()
        .eq("collection_id", id);

      if (deleteError) throw new Error(deleteError.message);

      // Insert new associations
      if (product_ids.length > 0) {
        const rows = product_ids.map((productId: string, index: number) => ({
          collection_id: id,
          product_id: productId,
          sort_order: index,
        }));

        const { error: insertError } = await supabase
          .from("collection_products")
          .insert(rows);

        if (insertError) throw new Error(insertError.message);
      }
    }

    // Return updated collection
    const { data: updated, error: fetchError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update collection";
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
    const { id } = params;

    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete collection";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
