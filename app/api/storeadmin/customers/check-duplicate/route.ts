import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { checkDuplicateCustomer } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, "superadmin", "admin");
    const { phone = "", instagram = "" } = await request.json();
    const result = await checkDuplicateCustomer(phone, instagram);
    return NextResponse.json(result);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
