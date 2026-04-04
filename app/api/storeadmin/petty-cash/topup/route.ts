import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getRoleForUser } from "@/lib/storeadmin/server/auth";
import { createPettyCashTopup } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    const username = await authenticateRequest(request);
    const role = getRoleForUser(username);
    if (role !== "finance" && role !== "admin") {
      return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
    }
    const { amount, note } = await request.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ detail: "Amount must be positive" }, { status: 400 });
    }
    const expense = await createPettyCashTopup(amount, note);
    return NextResponse.json({ success: true, expense });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
