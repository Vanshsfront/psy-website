import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getOrderById } from "@/lib/storeadmin/server/database";

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
