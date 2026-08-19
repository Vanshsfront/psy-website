import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { fetchAllTemplates } from "@/lib/storeadmin/server/whatsapp-utils";

export async function GET(request: NextRequest) {
  try {
    await requireRoute(request);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
  const result = await fetchAllTemplates();
  return NextResponse.json(result);
}
