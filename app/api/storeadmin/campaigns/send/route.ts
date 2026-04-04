import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getDb } from "@/lib/storeadmin/server/database";
import { createCampaign, updateCampaignStatus, createMessageLog } from "@/lib/storeadmin/server/database";
import { sendBatchTemplate } from "@/lib/storeadmin/server/whatsapp-utils";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const body = await request.json();
    const { template_name, language_code = "en", customer_ids, nl_filter_text = "", resolved_query = "" } = body;

    const campaign = await createCampaign({
      template_name,
      nl_filter_text,
      resolved_query,
      matched_count: customer_ids.length,
      status: "sending",
    });
    const campaignId = campaign.id;

    const { data: customers } = await getDb().from("customers").select("*").in("id", customer_ids);

    const results = await sendBatchTemplate(customers ?? [], template_name, language_code);

    let successCount = 0;
    for (const r of results) {
      await createMessageLog({
        campaign_id: campaignId,
        customer_id: r.customer_id,
        phone: r.phone ?? "",
        template_name,
        rendered_payload: { template: template_name, customer_name: r.customer_name },
        status: r.success ? "sent" : "failed",
        error_message: r.error,
        whatsapp_message_id: r.message_id,
      });
      if (r.success) successCount++;
    }

    const finalStatus = successCount > 0 ? "completed" : "failed";
    await updateCampaignStatus(campaignId, finalStatus);

    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
      total: results.length,
      sent: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
