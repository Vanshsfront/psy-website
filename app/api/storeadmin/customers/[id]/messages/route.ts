import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getCustomerMessageLogs } from "@/lib/storeadmin/server/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, "superadmin", "admin");
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }

  const logs = await getCustomerMessageLogs(params.id, 200);
  return NextResponse.json({ logs });
}
