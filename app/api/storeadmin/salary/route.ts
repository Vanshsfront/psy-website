import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getSalarySlips } from "@/lib/storeadmin/server/salary";
import { OWN_RECORDS_ONLY } from "@/lib/auth/permissions";

/**
 * Payroll.
 *
 * Admins see every slip. An Executive sees their own and nothing else, which is
 * what "Salary Slip" under Executive in Yogesh's spec means for a login that is
 * kept to its own records. The scoping happens here, not in the page.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const params = request.nextUrl.searchParams;
    const from = params.get("from") || "";
    const to = params.get("to") || "";
    if (!from || !to) {
      return NextResponse.json({ detail: "Pick a month" }, { status: 400 });
    }
    // Taken from the account, never from a parameter, so it cannot be widened.
    const scope = OWN_RECORDS_ONLY.includes(me.role) ? me.artistId : null;
    if (OWN_RECORDS_ONLY.includes(me.role) && !scope) {
      // An artist login with no linked artist record has no slip to show. Empty
      // is the honest answer; falling through would hand them everyone's.
      return NextResponse.json({ slips: [] });
    }
    const slips = await getSalarySlips(from, to, scope);
    return NextResponse.json({ slips });
  } catch (e) {
    // authErrorResponse now distinguishes the two: only a real auth
    // failure is 401 or 403, anything else is 500 with the detail logged
    // rather than returned, because database errors quote table names.
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
