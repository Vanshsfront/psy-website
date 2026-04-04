import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { createCustomer, createOrder, getArtistByName, createArtist, updateOcrSession } from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const body = await request.json();
    const { session_id, fields, create_new_customer, customer_data } = body;
    let customerId = body.customer_id;

    if (create_new_customer && customer_data) {
      const customer = await createCustomer(customer_data);
      customerId = customer.id;
    }

    if (!customerId) {
      return NextResponse.json({ detail: "Must provide customer_id or create_new_customer" }, { status: 400 });
    }

    // Resolve artist
    let artistId = null;
    const artistName = fields?.artist;
    if (artistName) {
      let artist = await getArtistByName(artistName);
      if (!artist) artist = await createArtist(artistName);
      artistId = artist.id;
    }

    const today = new Date().toISOString().split("T")[0];
    const order = await createOrder({
      customer_id: customerId,
      artist_id: artistId,
      order_date: fields?.date ?? today,
      service_description: fields?.service_description,
      payment_mode: fields?.payment_mode,
      deposit: fields?.deposit ?? 0,
      total: fields?.total ?? 0,
      comments: fields?.comments,
      source: fields?.source,
    });

    await updateOcrSession(session_id, {
      status: "confirmed",
      linked_order_id: order.id,
    });

    return NextResponse.json({ success: true, order, customer_id: customerId });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
