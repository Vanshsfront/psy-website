import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { OWN_RECORDS_ONLY } from "@/lib/auth/permissions";
import { getOrders, getCustomerById, createOrder } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const params = request.nextUrl.searchParams;
    const customerId = params.get("customer_id") || "";
    const rawLimit = Number(params.get("limit"));

    // An Executive sees only their own orders. Taken from their account rather
    // than from a query parameter, so the scope cannot be widened by editing
    // the URL. Same rule as appointments.
    const artistScope = OWN_RECORDS_ONLY.includes(me.role) ? me.artistId : null;

    const orders = rawLimit > 0
      ? await getOrders(customerId, rawLimit, artistScope)
      : await getOrders(customerId, undefined, artistScope);
    return NextResponse.json({ orders });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const body = await request.json();

    // An Executive can only ever record work against themselves, whatever the
    // request body says.
    if (OWN_RECORDS_ONLY.includes(me.role)) body.artist_id = me.artistId;

    const customer = await getCustomerById(body.customer_id);
    if (!customer) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }
    let order;
    try {
      order = await createOrder(body);
    } catch (dbError) {
      // Say what actually went wrong. A rejected insert used to be reported as
      // a successful save, which is how an order could vanish while its
      // customer was created.
      const detail = dbError instanceof Error ? dbError.message : "Could not save the order";
      console.error("createOrder failed:", dbError);
      return NextResponse.json({ detail }, { status: 400 });
    }
    return NextResponse.json({ created: true, order });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
