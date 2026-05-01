import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getOrderById, updateOrder, deleteOrder } from "@/lib/storeadmin/server/database";

const ALLOWED_FIELDS = new Set([
  "artist_id",
  "order_date",
  "service_description",
  "payment_mode",
  "deposit",
  "total",
  "comments",
  "source",
  "tracking_number",
  "courier_name",
  "admin_notes",
  "discount_code",
  "discount_amount",
  "consent_signed",
]);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateRequest(request);
    const { id } = params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ detail: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await getOrderById(id);
  if (!existing) {
    return NextResponse.json({ detail: "Order not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) patch[k] = v;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ detail: "No editable fields to update" }, { status: 400 });
  }

  const nextDeposit = patch.deposit !== undefined ? Number(patch.deposit) : Number(existing.deposit ?? 0);
  const nextTotal = patch.total !== undefined ? Number(patch.total) : Number(existing.total ?? 0);
  if (!Number.isNaN(nextDeposit) && !Number.isNaN(nextTotal) && nextDeposit > nextTotal) {
    return NextResponse.json(
      { detail: "Deposit cannot exceed total" },
      { status: 400 }
    );
  }

  const order = await updateOrder(id, patch);
  if (!order) {
    return NextResponse.json({ detail: "Failed to update order" }, { status: 500 });
  }
  return NextResponse.json({ updated: true, order });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const ok = await deleteOrder(id);
  if (!ok) {
    return NextResponse.json({ detail: "Failed to delete order" }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
