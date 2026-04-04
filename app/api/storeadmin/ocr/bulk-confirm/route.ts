import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import {
  checkDuplicateCustomer,
  createCustomer,
  createOrder,
  getArtistByName,
  createArtist,
  updateOcrSession,
} from "@/lib/storeadmin/server/database";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const body = await request.json();
    const { session_id, orders } = body;

    const results: Array<Record<string, unknown>> = [];
    const today = new Date().toISOString().split("T")[0];

    for (const row of orders) {
      try {
        let customerId = row.customer_id;

        if (row.create_new_customer && row.customer_data) {
          const phone = row.customer_data.phone || "";
          const instagram = row.customer_data.instagram || "";
          const dup = await checkDuplicateCustomer(phone, instagram);
          if (dup.matches.length) {
            customerId = (dup.matches[0] as Record<string, unknown>).id;
          } else {
            const customer = await createCustomer(row.customer_data);
            customerId = customer.id;
          }
        }

        if (!customerId) {
          results.push({ success: false, error: "No customer info" });
          continue;
        }

        // Resolve artist
        let artistId = null;
        const artistName = row.fields?.artist;
        if (artistName) {
          let artist = await getArtistByName(artistName);
          if (!artist) artist = await createArtist(artistName);
          artistId = artist.id;
        }

        const order = await createOrder({
          customer_id: customerId,
          artist_id: artistId,
          order_date: row.fields?.date ?? today,
          service_description: row.fields?.service_description,
          payment_mode: row.fields?.payment_mode,
          deposit: row.fields?.deposit ?? 0,
          total: row.fields?.total ?? 0,
          comments: row.fields?.comments,
          source: row.fields?.source,
        });

        results.push({
          success: true,
          order_id: order.id,
          customer_id: customerId,
          customer_name: row.fields?.customer_name ?? "Unknown",
        });
      } catch (e) {
        results.push({
          success: false,
          error: e instanceof Error ? e.message : String(e),
          customer_name: row.fields?.customer_name ?? "Unknown",
        });
      }
    }

    await updateOcrSession(session_id, { status: "confirmed" });

    return NextResponse.json({
      success: true,
      total: results.length,
      saved: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
