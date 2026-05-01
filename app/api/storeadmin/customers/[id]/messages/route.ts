import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getCustomerMessageLogs } from "@/lib/storeadmin/server/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const logs = await getCustomerMessageLogs(params.id, 200);
  return NextResponse.json({ logs });
}
