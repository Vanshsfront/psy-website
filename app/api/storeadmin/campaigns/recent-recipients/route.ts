import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getRecentRecipients } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, "superadmin", "admin");
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
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
