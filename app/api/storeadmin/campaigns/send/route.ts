import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import {
  getDb,
  createCampaign,
  updateCampaignStatus,
  createMessageLog,
} from "@/lib/storeadmin/server/database";
import { sendBatchTemplate, fetchTemplates } from "@/lib/storeadmin/server/whatsapp-utils";

// PostgREST rejects an `in(...)` filter much past a thousand ids, because the
// whole list has to fit in the request line, so recipients are fetched in
// chunks. 200 ids is ~7.4 KB — the size batchCustomerMetrics settled on.
const ID_CHUNK = 200;

// Send and log in small batches so a request that dies half way still leaves an
// accurate record. Previously every message_log was written only after the
// entire send resolved, so a timeout meant the messages went out, nothing was
// logged, and the campaign sat on "sending" forever — precisely the reported
// "campaign gets partially executed".
const SEND_BATCH = 25;

export async function POST(request: NextRequest) {
  // Auth is resolved before the try that wraps the send, so a genuine send
  // failure can never surface as "Unauthorized" — which is what the previous
  // catch-all did to every error here, including template problems, database
  // errors and Meta rejections.
  try {
    await requireRoute(request);
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }

  let campaignId: string | undefined;

  try {
    const body = await request.json();
    const {
      template_name,
      language_code = "en",
      customer_ids,
      nl_filter_text = "",
      resolved_query = "",
    } = body;

    if (!template_name) {
      return NextResponse.json({ detail: "Pick a template first" }, { status: 400 });
    }
    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      return NextResponse.json({ detail: "No recipients selected" }, { status: 400 });
    }

    const tplResp = await fetchTemplates();
    if (!tplResp.success) {
      return NextResponse.json(
        { detail: tplResp.error ?? "Could not load templates from Meta" },
        { status: 502 }
      );
    }
    const template = tplResp.templates.find(
      (t: Record<string, unknown>) => t.name === template_name
    );
    if (!template) {
      return NextResponse.json(
        { detail: `Template not found or not approved: ${template_name}` },
        { status: 400 }
      );
    }

    const customers: Array<Record<string, unknown>> = [];
    for (let i = 0; i < customer_ids.length; i += ID_CHUNK) {
      const chunk = customer_ids.slice(i, i + ID_CHUNK);
      const { data, error } = await getDb().from("customers").select("*").in("id", chunk);
      if (error) throw new Error(`Could not load recipients: ${error.message}`);
      customers.push(...(data ?? []));
    }

    if (customers.length === 0) {
      return NextResponse.json(
        { detail: "None of the selected customers could be found" },
        { status: 400 }
      );
    }

    const campaign = await createCampaign({
      template_name,
      nl_filter_text,
      resolved_query,
      matched_count: customers.length,
      status: "sending",
    });
    campaignId = campaign.id as string;

    const results: Array<Record<string, unknown>> = [];
    let successCount = 0;

    for (let i = 0; i < customers.length; i += SEND_BATCH) {
      const batch = customers.slice(i, i + SEND_BATCH);
      const batchResults = await sendBatchTemplate(batch, template, language_code);

      await Promise.all(
        batchResults.map((r) =>
          createMessageLog({
            campaign_id: campaignId,
            customer_id: r.customer_id,
            phone: r.phone ?? "",
            template_name,
            rendered_payload: { template: template_name, customer_name: r.customer_name },
            status: r.success ? "sent" : "failed",
            error_message: r.error,
            whatsapp_message_id: r.message_id,
          }).catch(() => {
            // A logging failure must not abort a send that already happened: the
            // message is out either way, and losing the audit row is the lesser
            // of the two problems.
          })
        )
      );

      results.push(...batchResults);
      successCount += batchResults.filter((r) => r.success).length;
    }

    const failed = results.length - successCount;
    const finalStatus =
      successCount === 0 ? "failed" : failed > 0 ? "completed_with_errors" : "completed";
    await updateCampaignStatus(campaignId, finalStatus);

    // A 200 here means Meta accepted the messages, not that anyone received
    // them. Real delivery state arrives asynchronously on the webhook.
    return NextResponse.json({
      success: successCount > 0,
      campaign_id: campaignId,
      status: finalStatus,
      total: results.length,
      sent: successCount,
      failed,
      // Distinct reasons, so a campaign failing for one shared cause is obvious
      // without opening the logs row by row.
      errors: Array.from(
        new Set(results.filter((r) => !r.success && r.error).map((r) => String(r.error)))
      ).slice(0, 5),
      results,
    });
  } catch (e) {
    // Never leave a campaign stuck on "sending".
    if (campaignId) {
      await updateCampaignStatus(campaignId, "failed").catch(() => {});
    }
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ detail: message, campaign_id: campaignId }, { status: 500 });
  }
}
