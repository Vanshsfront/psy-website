import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { createExpense } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await requireRoute(request);
    const body = await request.json();
    let expense;
    try {
      expense = await createExpense(body);
    } catch (dbError) {
      // Say what the database refused, rather than reporting a rejected insert
      // as a saved expense or as a generic server fault.
      const detail = dbError instanceof Error ? dbError.message : "Could not save the expense";
      console.error("createExpense failed:", dbError);
      return NextResponse.json({ detail }, { status: 400 });
    }
    return NextResponse.json({ success: true, expense });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
