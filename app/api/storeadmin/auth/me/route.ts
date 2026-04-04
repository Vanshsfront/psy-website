import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getRoleForUser } from "@/lib/storeadmin/server/auth";

export async function GET(request: NextRequest) {
  try {
    const username = await authenticateRequest(request);
    const role = getRoleForUser(username);
    return NextResponse.json({ username, role });
  } catch {
    return NextResponse.json({ detail: "Invalid or expired token" }, { status: 401 });
  }
}
