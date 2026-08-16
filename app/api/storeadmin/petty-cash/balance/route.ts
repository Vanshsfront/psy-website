import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getPettyCashBalance } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    // Readable by staff: the balance card sits on the Expenses screen, which
    // admins use. Only topping the float up is restricted to the owner.
    await requireRole(request, "superadmin", "admin");
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }

  try {
    const balance = await getPettyCashBalance();
    return NextResponse.json(balance);
  } catch (err) {
    // A read failure must not look like a signed-out session, nor a ₹0 balance.
    console.error("petty-cash/balance failed:", err);
    return NextResponse.json({ detail: "Failed to load petty cash balance" }, { status: 500 });
  }
}
