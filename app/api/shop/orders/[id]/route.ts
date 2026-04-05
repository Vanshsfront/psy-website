import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/shop-auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", params.id)
      .eq("customer_id", customer.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch order";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
