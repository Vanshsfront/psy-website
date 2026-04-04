import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { createExpense } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const body = await request.json();
    const expense = await createExpense(body);
    return NextResponse.json({ success: true, expense });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
