import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getRecentRecipients } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const templateName = params.get("template_name") || undefined;
  const within = Number(params.get("within_days") || "0");
  const recipients = await getRecentRecipients({
    templateName,
    withinDays: Number.isFinite(within) ? within : undefined,
  });
  return NextResponse.json({ recipients });
}
