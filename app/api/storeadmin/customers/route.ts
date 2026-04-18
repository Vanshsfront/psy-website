import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getCustomers, checkDuplicateCustomer, createCustomer } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const params = request.nextUrl.searchParams;

    const rawLimit = Number(params.get("limit"));
    const customers = await getCustomers({
      search: params.get("search") || "",
      source: params.get("source") || "",
      artist_id: params.get("artist_id") || "",
      date_from: params.get("date_from") || "",
      date_to: params.get("date_to") || "",
      spend_min: Number(params.get("spend_min")) || 0,
      spend_max: Number(params.get("spend_max")) || 0,
      ...(rawLimit > 0 ? { limit: rawLimit } : {}),
      offset: Number(params.get("offset")) || 0,
    });

    return NextResponse.json({ customers, count: customers.length });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const body = await request.json();

    const dup = await checkDuplicateCustomer(body.phone || "", body.instagram || "");
    if (dup.matches.length) {
      return NextResponse.json({
        created: false,
        duplicate_detected: true,
        match_type: dup.match_type,
        matches: dup.matches,
        message: "Potential duplicate found. Please confirm or merge.",
      });
    }

    const customer = await createCustomer(body);
    return NextResponse.json({ created: true, customer });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
