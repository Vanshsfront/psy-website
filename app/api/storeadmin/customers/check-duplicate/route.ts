import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { checkDuplicateCustomer } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const { phone = "", instagram = "" } = await request.json();
    const result = await checkDuplicateCustomer(phone, instagram);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
