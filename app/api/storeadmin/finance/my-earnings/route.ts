import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getArtistEarnings } from "@/lib/storeadmin/server/database";

/**
 * The caller's own earnings.
 *
 * Distinct from /api/storeadmin/finance/summary, which is the studio's revenue,
 * expenses and profit and stays Admin-only. Yogesh asked for Executives to see
 * "their own earnings only", never the studio totals or another artist's work.
 *
 * The artist id comes from the authenticated account and is never read from the
 * request, so there is no parameter to tamper with. An account not linked to an
 * artist gets zeroes rather than everything.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const params = request.nextUrl.searchParams;

    const earnings = await getArtistEarnings(
      me.artistId,
      params.get("from") || "",
      params.get("to") || ""
    );

    return NextResponse.json({ earnings, linkedToArtist: Boolean(me.artistId) });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
