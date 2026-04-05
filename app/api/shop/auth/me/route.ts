import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request);

    if (!customer) {
      return NextResponse.json(
        { detail: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json(
      { detail: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
