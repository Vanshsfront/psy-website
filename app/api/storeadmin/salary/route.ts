import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getSalarySlips } from "@/lib/storeadmin/server/salary";

/** Payroll. Admin only, and never scoped to the caller: this is everyone's pay. */
export async function GET(request: NextRequest) {
  try {
    await requireRoute(request);
    const params = request.nextUrl.searchParams;
    const from = params.get("from") || "";
    const to = params.get("to") || "";
    if (!from || !to) {
      return NextResponse.json({ detail: "Pick a month" }, { status: 400 });
    }
    const slips = await getSalarySlips(from, to);
    return NextResponse.json({ slips });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    if (status === 401 || status === 403) return NextResponse.json({ detail }, { status });
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Could not work out the salary slips" },
      { status: 500 }
    );
  }
}
