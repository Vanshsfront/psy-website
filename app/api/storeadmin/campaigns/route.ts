import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { listCampaigns, getCampaignStats } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await listCampaigns(200);
  const stats = await getCampaignStats(campaigns.map((c: { id: string }) => c.id));
  const enriched = campaigns.map((c: Record<string, unknown>) => ({
    ...c,
    sent_count: stats[c.id as string]?.sent ?? 0,
    failed_count: stats[c.id as string]?.failed ?? 0,
  }));
  return NextResponse.json({ campaigns: enriched });
}
