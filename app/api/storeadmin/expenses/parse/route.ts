import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { parseExpense } from "@/lib/storeadmin/server/expense-parser";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const { text } = await request.json();
    const result = await parseExpense(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
