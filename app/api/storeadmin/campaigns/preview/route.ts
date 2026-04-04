import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getCustomerById } from "@/lib/storeadmin/server/database";
import { fetchTemplates, renderTemplatePreview } from "@/lib/storeadmin/server/whatsapp-utils";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);

    const formData = await request.formData();
    const templateName = formData.get("template_name") as string || "";
    const customerIdsStr = formData.get("customer_ids") as string || "";

    const templatesResult = await fetchTemplates();
    let template: Record<string, unknown> | null = null;
    if (templatesResult.success) {
      for (const t of templatesResult.templates) {
        if ((t as Record<string, unknown>).name === templateName) {
          template = t as Record<string, unknown>;
          break;
        }
      }
    }

    if (!template) {
      return NextResponse.json({ success: false, error: `Template '${templateName}' not found`, previews: [] });
    }

    const ids = customerIdsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const previews: Array<Record<string, unknown>> = [];
    for (const cid of ids) {
      const customer = await getCustomerById(cid);
      if (customer) {
        const preview = renderTemplatePreview(template, customer);
        previews.push(preview);
      }
    }

    return NextResponse.json({ success: true, previews });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
