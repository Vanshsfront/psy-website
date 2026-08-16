import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { parseExpense } from "@/lib/storeadmin/server/expense-parser";

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, "superadmin", "admin");
    const { text } = await request.json();
    const result = await parseExpense(text);
    return NextResponse.json(result);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
