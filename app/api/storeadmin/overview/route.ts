import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getCombinedOverview } from "@/lib/storeadmin/server/overview";

/** Both businesses at once. Admin only, because it is a money screen. */
export async function GET(request: NextRequest) {
  try {
    await requireRoute(request);
    const overview = await getCombinedOverview();
    return NextResponse.json({ overview });
  } catch (e) {
    // authErrorResponse now distinguishes the two: only a real auth
    // failure is 401 or 403, anything else is 500 with the detail logged
    // rather than returned, because database errors quote table names.
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
