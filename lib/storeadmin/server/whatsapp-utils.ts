function getConfig() {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const wabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim();
  const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v19.0").trim();

  if (!token || !phoneId) return null;

  return {
    token,
    phoneId,
    wabaId,
    version,
    baseUrl: `https://graph.facebook.com/${version}`,
    messagesUrl: `https://graph.facebook.com/${version}/${phoneId}/messages`,
  };
}

export function isConfigured(): boolean {
  return getConfig() !== null;
}

export async function fetchTemplates() {
  const config = getConfig();
  if (!config) return { success: false, templates: [], error: "WhatsApp not configured" };

  if (!config.wabaId) {
    return { success: false, templates: [], error: "WHATSAPP_BUSINESS_ACCOUNT_ID not set — required for fetching templates" };
  }

  const url = `${config.baseUrl}/${config.wabaId}/message_templates`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(30000),
    });
    const respData = await resp.json();

    if (resp.ok) {
      const templates = (respData.data ?? [])
        .filter((t: Record<string, unknown>) => t.status === "APPROVED")
        .map((t: Record<string, unknown>) => ({
          name: t.name,
          language: t.language,
          category: t.category,
          components: t.components ?? [],
        }));
      return { success: true, templates, error: null };
    } else {
      const errorMsg = respData.error?.message ?? JSON.stringify(respData);
      return { success: false, templates: [], error: String(errorMsg) };
    }
  } catch (e) {
    return { success: false, templates: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export function renderTemplatePreview(template: Record<string, unknown>, customer: Record<string, unknown>) {
  const previewParts: string[] = [];

  for (const component of (template.components as Array<Record<string, unknown>>) ?? []) {
    const compType = (component.type as string) ?? "";
    if (compType === "BODY") {
      let text = (component.text as string) ?? "";
      text = text.replace("{{1}}", (customer.name as string) ?? "Customer");
      text = text.replace("{{2}}", (customer.phone as string) ?? "");
      text = text.replace("{{3}}", (customer.instagram as string) ?? "");
      previewParts.push(text);
    } else if (compType === "HEADER") {
      let headerText = (component.text as string) ?? "";
      if (headerText) {
        headerText = headerText.replace("{{1}}", (customer.name as string) ?? "Customer");
        previewParts.unshift(`**${headerText}**`);
      }
    } else if (compType === "FOOTER") {
      const footerText = (component.text as string) ?? "";
      if (footerText) previewParts.push(`_${footerText}_`);
    }
  }

  return {
    preview_text: previewParts.length ? previewParts.join("\n\n") : "(Template preview unavailable)",
    customer_name: (customer.name as string) ?? "",
    customer_phone: (customer.phone as string) ?? "",
  };
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  languageCode = "en",
  bodyParameters?: Array<Record<string, string>>,
  headerParameters?: Array<Record<string, string>>
) {
  const config = getConfig();
  if (!config) return { success: false, error: "WhatsApp not configured" };

  const cleanPhone = phone.replace(/[\s-]/g, "").replace(/^\+/, "");

  const components: Array<Record<string, unknown>> = [];
  if (headerParameters) {
    components.push({ type: "header", parameters: headerParameters });
  }
  if (bodyParameters) {
    components.push({ type: "body", parameters: bodyParameters });
  }

  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  try {
    const resp = await fetch(config.messagesUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const respData = await resp.json();

    if (resp.ok) {
      const msgId = respData.messages?.[0]?.id ?? null;
      return { success: true, data: { message_id: msgId } };
    } else {
      const errorMsg = respData.error?.message ?? JSON.stringify(respData);
      return { success: false, error: String(errorMsg) };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function countPlaceholders(text: string): number {
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  let max = 0;
  for (const m of matches) {
    const n = parseInt(m.slice(2, -2), 10);
    if (n > max) max = n;
  }
  return max;
}

function paramForIndex(index: number, customer: Record<string, unknown>): string {
  // {{1}} -> name, {{2}} -> phone, {{3}} -> instagram. Extra indices fall back to empty string.
  switch (index) {
    case 1:
      return ((customer.name as string) ?? "").trim() || "there";
    case 2:
      return (customer.phone as string) ?? "";
    case 3:
      return (customer.instagram as string) ?? "";
    default:
      return "";
  }
}

function buildParams(placeholderCount: number, customer: Record<string, unknown>) {
  const params: Array<Record<string, string>> = [];
  for (let i = 1; i <= placeholderCount; i++) {
    params.push({ type: "text", text: paramForIndex(i, customer) });
  }
  return params;
}

export async function sendBatchTemplate(
  customers: Array<Record<string, unknown>>,
  template: Record<string, unknown>,
  languageCode = "en"
) {
  const results: Array<Record<string, unknown>> = [];

  const components = (template.components as Array<Record<string, unknown>>) ?? [];
  const bodyComp = components.find((c) => (c.type as string) === "BODY");
  const headerComp = components.find((c) => (c.type as string) === "HEADER");
  const bodyPlaceholders = bodyComp ? countPlaceholders((bodyComp.text as string) ?? "") : 0;
  const headerPlaceholders =
    headerComp && (headerComp.format as string | undefined) !== "IMAGE" && (headerComp.format as string | undefined) !== "VIDEO" && (headerComp.format as string | undefined) !== "DOCUMENT"
      ? countPlaceholders((headerComp.text as string) ?? "")
      : 0;

  const templateName = (template.name as string) ?? "";

  for (const customer of customers) {
    const phone = (customer.phone as string) ?? "";
    const name = (customer.name as string) ?? "Unknown";

    if (!phone) {
      results.push({ customer_id: customer.id, customer_name: name, phone, success: false, error: "No phone number" });
      continue;
    }

    const bodyParams = bodyPlaceholders > 0 ? buildParams(bodyPlaceholders, customer) : undefined;
    const headerParams = headerPlaceholders > 0 ? buildParams(headerPlaceholders, customer) : undefined;

    const result = await sendTemplateMessage(phone, templateName, languageCode, bodyParams, headerParams);

    results.push({
      customer_id: customer.id,
      customer_name: name,
      phone,
      success: result.success,
      message_id: result.success ? (result as { data: { message_id: string } }).data?.message_id : null,
      error: (result as { error?: string }).error,
    });
  }

  return results;
}

export async function fetchAllTemplates() {
  const config = getConfig();
  if (!config) return { success: false, templates: [], error: "WhatsApp not configured" };
  if (!config.wabaId) {
    return { success: false, templates: [], error: "WHATSAPP_BUSINESS_ACCOUNT_ID not set" };
  }

  const url = `${config.baseUrl}/${config.wabaId}/message_templates?fields=name,language,category,status,components,rejected_reason,id&limit=100`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(30000),
    });
    const respData = await resp.json();
    if (!resp.ok) {
      const errorMsg = respData.error?.message ?? JSON.stringify(respData);
      return { success: false, templates: [], error: String(errorMsg) };
    }
    const templates = (respData.data ?? []).map((t: Record<string, unknown>) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      category: t.category,
      status: t.status,
      components: t.components ?? [],
      rejected_reason: t.rejected_reason ?? null,
    }));
    return { success: true, templates, error: null };
  } catch (e) {
    return { success: false, templates: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createTemplate(input: {
  name: string;
  category: string;
  language?: string;
  body: string;
  button_text?: string;
  button_url?: string;
  example?: string;
}) {
  const config = getConfig();
  if (!config) return { success: false, error: "WhatsApp not configured" };
  if (!config.wabaId) return { success: false, error: "WHATSAPP_BUSINESS_ACCOUNT_ID not set" };

  const language = (input.language ?? "en").trim();
  const example = (input.example ?? "Priya").trim() || "Priya";
  const hasButton = !!(input.button_text && input.button_url);

  const components: Array<Record<string, unknown>> = [
    {
      type: "BODY",
      text: input.body,
      ...(countPlaceholders(input.body) > 0 ? { example: { body_text: [[example]] } } : {}),
    },
  ];
  if (hasButton) {
    components.push({
      type: "BUTTONS",
      buttons: [{ type: "URL", text: input.button_text, url: input.button_url }],
    });
  }

  const payload = {
    name: input.name,
    category: input.category,
    language,
    components,
  };

  const url = `${config.baseUrl}/${config.wabaId}/message_templates`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json();
    if (!resp.ok) {
      const errorMsg = data.error?.message ?? JSON.stringify(data);
      return { success: false, error: String(errorMsg) };
    }
    return { success: true, id: data.id as string | undefined, status: data.status as string | undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteTemplate(name: string) {
  const config = getConfig();
  if (!config) return { success: false, error: "WhatsApp not configured" };
  if (!config.wabaId) return { success: false, error: "WHATSAPP_BUSINESS_ACCOUNT_ID not set" };

  const url = `${config.baseUrl}/${config.wabaId}/message_templates?name=${encodeURIComponent(name)}`;
  try {
    const resp = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json();
    if (!resp.ok) {
      const errorMsg = data.error?.message ?? JSON.stringify(data);
      return { success: false, error: String(errorMsg) };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
