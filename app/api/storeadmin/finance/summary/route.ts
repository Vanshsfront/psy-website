import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getFinancialSummary } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, "superadmin");
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }

  try {
    const params = request.nextUrl.searchParams;
    const summary = await getFinancialSummary(
      params.get("date_from") || "",
      params.get("date_to") || ""
    );
    return NextResponse.json(summary);
  } catch (err) {
    // Surface read failures rather than letting the dashboard render a
    // confident-looking zero.
    console.error("finance/summary failed:", err);
    return NextResponse.json({ detail: "Failed to load financial summary" }, { status: 500 });
  }
}
