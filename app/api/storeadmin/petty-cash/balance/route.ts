import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getPettyCashBalance } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
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
