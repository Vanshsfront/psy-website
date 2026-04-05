import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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
    const results: Record<string, unknown> = {};

    // Update product-level stock_quantity
    if (typeof body.stock_quantity === "number") {
      const { data, error } = await supabase
        .from("products")
        .update({ stock_quantity: body.stock_quantity })
        .eq("id", params.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      results.product = data;
    }

    // Batch-update variant stock quantities
    if (Array.isArray(body.variants)) {
      const updatedVariants = [];

      for (const v of body.variants) {
        if (!v.id || typeof v.stock_quantity !== "number") continue;

        const { data, error } = await supabase
          .from("product_variants")
          .update({ stock_quantity: v.stock_quantity })
          .eq("id", v.id)
          .eq("product_id", params.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        updatedVariants.push(data);
      }

      results.variants = updatedVariants;
    }

    if (Object.keys(results).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    return NextResponse.json(results);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update inventory";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
