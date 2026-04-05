import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient } from "@/lib/supabase-server";

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

    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, images, stock_quantity, stock_status, category")
      .eq("is_deleted", false)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    // Fetch variants for all products
    const productIds = (products || []).map((p) => p.id);

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, product_id, label, sku, stock_quantity, price_override")
      .in("product_id", productIds.length > 0 ? productIds : [""]);

    if (variantsError) throw new Error(variantsError.message);

    // Group variants by product_id
    const variantsByProduct: Record<string, typeof variants> = {};
    for (const v of variants || []) {
      if (!variantsByProduct[v.product_id]) {
        variantsByProduct[v.product_id] = [];
      }
      variantsByProduct[v.product_id].push(v);
    }

    const result = (products || []).map((p) => ({
      ...p,
      variants: variantsByProduct[p.id] || [],
    }));

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch inventory";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
