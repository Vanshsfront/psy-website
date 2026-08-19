import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getAnalytics, type Grain } from "@/lib/storeadmin/server/analytics";

const GRAINS = new Set<Grain>(["week", "month", "quarter"]);

/**
 * Analytics over orders and appointments.
 *
 * Staff, not owner-only: these are revenue and volume numbers, and "We don't
 * want to gate revenue numbers because the team works on revenue targets."
 * Nothing here reports profit or cost.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoute(request);
    const p = request.nextUrl.searchParams;
    const grain = (p.get("grain") || "month") as Grain;
    if (!GRAINS.has(grain)) {
      return NextResponse.json({ detail: "Unknown grain" }, { status: 400 });
    }
    const analytics = await getAnalytics(
      p.get("from") || "",
      p.get("to") || "",
      grain,
      p.get("artist_id") || null
    );
    return NextResponse.json({ analytics });
  } catch (e) {
    // authErrorResponse now distinguishes the two: only a real auth
    // failure is 401 or 403, anything else is 500 with the detail logged
    // rather than returned, because database errors quote table names.
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
