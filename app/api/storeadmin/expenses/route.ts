import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getExpenses } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, "superadmin", "admin");
    const params = request.nextUrl.searchParams;
    const expenses = await getExpenses({
      date_from: params.get("date_from") || "",
      date_to: params.get("date_to") || "",
      category: params.get("category") || "",
      expense_type: params.get("expense_type") || "",
      payment_mode: params.get("payment_mode") || "",
      // Defaulting to 200 silently truncated the list — and every total the page
      // computed from it — once the studio passed 200 expenses. getExpenses pages
      // internally, so the cap only needs to be higher than the real row count.
      limit: Number(params.get("limit")) || 5000,
    });
    return NextResponse.json({ expenses });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
