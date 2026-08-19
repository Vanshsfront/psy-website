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
    const { detail, status } = authErrorResponse(e);
    if (status === 401 || status === 403) return NextResponse.json({ detail }, { status });
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Could not load the overview" },
      { status: 500 }
    );
  }
}
