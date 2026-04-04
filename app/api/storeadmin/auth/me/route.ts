import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";

export async function GET(request: NextRequest) {
  try {
    const username = await authenticateRequest(request);
    return NextResponse.json({ username });
  } catch {
    return NextResponse.json({ detail: "Invalid or expired token" }, { status: 401 });
  }
}
