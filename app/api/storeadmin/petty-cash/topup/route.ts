import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { createPettyCashTopup, getPettyCashTopups } from "@/lib/storeadmin/server/database";

/**
 * The top-up log.
 *
 * Top-ups are stored as expense rows with category 'topup' and are filtered out
 * of every expense list and total, so until this existed there was nowhere to
 * see them: "Unable to see top up logs", 2026-08-20. Readable by whoever can
 * see the balance; adding money stays with the owner.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoute(request);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }

  try {
    const topups = await getPettyCashTopups();
    return NextResponse.json({ topups });
  } catch (err) {
    console.error("petty-cash/topup GET failed:", err);
    return NextResponse.json({ detail: "Failed to load the top-up log" }, { status: 500 });
  }
}

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
