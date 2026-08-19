import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getFinancialSummary } from "@/lib/storeadmin/server/database";
import { can } from "@/lib/auth/permissions";

export async function GET(request: NextRequest) {
  let me;
  try {
    me = await requireRoute(request);
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
    // Managers see revenue, because the team works to revenue targets, but
    // profit stays with the owner. Removed here rather than hidden in the UI:
    // a number that is only hidden by the client is not withheld at all, it is
    // one devtools panel away.
    if (!can(me.role, "profit.view")) {
      // Only profit. The petty cash float is operational and already readable
      // by staff through /api/storeadmin/petty-cash/balance, so withholding it
      // here would break the screen without withholding anything.
      const { profit, ...rest } = summary as Record<string, unknown> & { profit?: unknown };
      void profit;
      return NextResponse.json({ ...rest, profit_withheld: true });
    }

    return NextResponse.json(summary);
  } catch (err) {
    // Surface read failures rather than letting the dashboard render a
    // confident-looking zero.
    console.error("finance/summary failed:", err);
    return NextResponse.json({ detail: "Failed to load financial summary" }, { status: 500 });
  }
}
