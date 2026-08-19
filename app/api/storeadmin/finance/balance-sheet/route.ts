import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getBalanceSheet } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    // Owner only, like the rest of Finance.
    await requireRoute(request);
    const params = request.nextUrl.searchParams;

    // Defaults to the current calendar month, which is the unit the studio's
    // existing spreadsheet uses.
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfMonth = `${lastOfMonth.getFullYear()}-${pad(lastOfMonth.getMonth() + 1)}-${pad(lastOfMonth.getDate())}`;

    const from = params.get("from") || firstOfMonth;
    const to = params.get("to") || endOfMonth;

    const sheet = await getBalanceSheet(from, to);
    return NextResponse.json(sheet);
  } catch (e) {
    // authErrorResponse now distinguishes the two: only a real auth
    // failure is 401 or 403, anything else is 500 with the detail logged
    // rather than returned, because database errors quote table names.
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
