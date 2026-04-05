import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/shop-auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { order_id, reason, items } = await request.json();

    if (!order_id || !reason) {
      return NextResponse.json(
        { error: "order_id and reason are required" },
        { status: 400 }
      );
    }

    // Verify order belongs to customer and is in a returnable status
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.customer_id !== customer.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const returnableStatuses = ["paid", "shipped", "delivered"];
    if (!returnableStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          error: `Cannot request return for order with status '${order.status}'`,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("return_requests")
      .insert({
        order_id,
        customer_id: customer.id,
        reason,
        items: items || null,
        status: "requested",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create return request";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("return_requests")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch return requests";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
