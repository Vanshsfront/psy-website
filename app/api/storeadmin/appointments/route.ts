import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getAppointments, createAppointment } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const params = request.nextUrl.searchParams;

    // An artist sees only their own column. Derived from their account, never
    // from a query parameter, so it cannot be widened by editing the URL.
    const artistScope = me.role === "artist" ? me.artistId : null;

    const appointments = await getAppointments({
      from: params.get("from") || "",
      to: params.get("to") || "",
      status: params.get("status") || "",
      artistScope,
    });
    return NextResponse.json({ appointments });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const body = await request.json();

    if (!body.customer_id) {
      return NextResponse.json({ detail: "Pick a customer" }, { status: 400 });
    }
    if (!body.starts_at) {
      return NextResponse.json({ detail: "Pick a date and time" }, { status: 400 });
    }

    // An artist can only ever book against themselves.
    if (me.role === "artist") body.artist_id = me.artistId;

    const appointment = await createAppointment(body, me.username);
    return NextResponse.json({ created: true, appointment });
  } catch (e) {
    // authErrorResponse now distinguishes the two: only a real auth
    // failure is 401 or 403, anything else is 500 with the detail logged
    // rather than returned, because database errors quote table names.
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
