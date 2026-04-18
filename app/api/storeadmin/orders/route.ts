import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getOrders, getCustomerById, createOrder } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const params = request.nextUrl.searchParams;
    const customerId = params.get("customer_id") || "";
    const rawLimit = Number(params.get("limit"));
    const orders = rawLimit > 0 ? await getOrders(customerId, rawLimit) : await getOrders(customerId);
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const body = await request.json();
    const customer = await getCustomerById(body.customer_id);
    if (!customer) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }
    const order = await createOrder(body);
    return NextResponse.json({ created: true, order });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
