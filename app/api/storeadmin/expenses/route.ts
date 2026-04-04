import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getExpenses } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const params = request.nextUrl.searchParams;
    const expenses = await getExpenses({
      date_from: params.get("date_from") || "",
      date_to: params.get("date_to") || "",
      category: params.get("category") || "",
      limit: Number(params.get("limit")) || 200,
    });
    return NextResponse.json({ expenses });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
