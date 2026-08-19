import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { checkDuplicateCustomer } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await requireRoute(request);
    const { phone = "", instagram = "" } = await request.json();
    const result = await checkDuplicateCustomer(phone, instagram);
    return NextResponse.json(result);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
