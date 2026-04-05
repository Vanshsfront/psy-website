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

    const { data, error } = await supabase
      .from("return_requests")
      .select(
        "*, orders:order_id(id, order_number, status, items, total_amount, created_at), shop_customers:customer_id(id, name, email, phone)"
      )
      .eq("id", params.id)
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch return request";
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
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.admin_notes !== undefined) updateData.admin_notes = body.admin_notes;
    if (typeof body.refund_amount === "number")
      updateData.refund_amount = body.refund_amount;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("return_requests")
      .update(updateData)
      .eq("id", params.id)
      .select("*, orders:order_id(id, order_number)")
      .single();

    if (error) throw new Error(error.message);

    // If marking as completed with a refund, update order status
    if (
      body.status === "completed" &&
      typeof body.refund_amount === "number" &&
      data.order_id
    ) {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "refunded" })
        .eq("id", data.order_id);

      if (orderError) throw new Error(orderError.message);
    }

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update return request";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
