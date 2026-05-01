import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getCampaignWithLogs } from "@/lib/storeadmin/server/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { campaign, logs } = await getCampaignWithLogs(params.id);
  if (!campaign) {
    return NextResponse.json({ detail: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json({ campaign, logs });
}
