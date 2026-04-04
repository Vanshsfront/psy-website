import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getCustomerById, updateCustomer, deleteCustomer, getOrders } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateRequest(request);
    const { id } = params;
    const customer = await getCustomerById(id);
    if (!customer) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }
    const orders = await getOrders(id);
    return NextResponse.json({ ...customer, orders });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateRequest(request);
    const { id } = params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v != null) data[k] = v;
    }
    if (!Object.keys(data).length) {
      return NextResponse.json({ detail: "No fields to update" }, { status: 400 });
    }
    const customer = await updateCustomer(id, data);
    return NextResponse.json({ updated: true, customer });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateRequest(request);
    const { id } = params;
    const success = await deleteCustomer(id);
    if (!success) {
      return NextResponse.json({ detail: "Failed to delete customer" }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
