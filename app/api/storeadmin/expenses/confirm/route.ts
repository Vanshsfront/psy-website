import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { createExpense } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await requireRoute(request);
    const body = await request.json();
    const expense = await createExpense(body);
    return NextResponse.json({ success: true, expense });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
