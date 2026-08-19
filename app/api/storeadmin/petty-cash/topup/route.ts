import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { createPettyCashTopup } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await requireRoute(request);
    const { amount, note } = await request.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ detail: "Amount must be positive" }, { status: 400 });
    }
    const expense = await createPettyCashTopup(amount, note);
    return NextResponse.json({ success: true, expense });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
