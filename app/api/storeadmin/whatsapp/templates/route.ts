import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { fetchTemplates } from "@/lib/storeadmin/server/whatsapp-utils";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const result = await fetchTemplates();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
