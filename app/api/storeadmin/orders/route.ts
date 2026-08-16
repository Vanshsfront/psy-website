import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getOrders, getCustomerById, createOrder } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, "superadmin", "admin");
    const params = request.nextUrl.searchParams;
    const customerId = params.get("customer_id") || "";
    const rawLimit = Number(params.get("limit"));
    const orders = rawLimit > 0 ? await getOrders(customerId, rawLimit) : await getOrders(customerId);
    return NextResponse.json({ orders });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, "superadmin", "admin");
    const body = await request.json();
    const customer = await getCustomerById(body.customer_id);
    if (!customer) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }
    const order = await createOrder(body);
    return NextResponse.json({ created: true, order });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
