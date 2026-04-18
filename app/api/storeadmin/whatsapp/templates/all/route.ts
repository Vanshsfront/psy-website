import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { fetchAllTemplates } from "@/lib/storeadmin/server/whatsapp-utils";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const result = await fetchAllTemplates();
  return NextResponse.json(result);
}
