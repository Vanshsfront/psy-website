import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getFinancialSummary } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const params = request.nextUrl.searchParams;
    const summary = await getFinancialSummary(
      params.get("date_from") || "",
      params.get("date_to") || ""
    );
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
