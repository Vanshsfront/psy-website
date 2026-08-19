import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { getCampaignWithLogs } from "@/lib/storeadmin/server/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoute(request);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }

  const { campaign, logs } = await getCampaignWithLogs(params.id);
  if (!campaign) {
    return NextResponse.json({ detail: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json({ campaign, logs });
}
