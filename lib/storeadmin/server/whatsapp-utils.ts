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

  const url = `${config.baseUrl}/${config.wabaId}/message_templates?fields=name,language,category,status,components,parameter_format&limit=100`;

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
          parameter_format: t.parameter_format ?? null,
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

// Indian-mobile default: studio operates in India (₹, UPI).
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0") && p.length === 11) p = p.slice(1);
  if (/^[6-9]\d{9}$/.test(p)) p = "91" + p;
  if (!/^\d{10,15}$/.test(p)) return null;
  return p;
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  languageCode = "en",
  bodyParameters?: Array<Record<string, string>>,
  headerParameters?: Array<Record<string, string>>,
  buttonComponents?: Array<Record<string, unknown>>
) {
  const config = getConfig();
  if (!config) return { success: false, error: "WhatsApp not configured" };

  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return { success: false, error: "Invalid phone format" };

  const components: Array<Record<string, unknown>> = [];
  if (headerParameters) {
    components.push({ type: "header", parameters: headerParameters });
  }
  if (bodyParameters) {
    components.push({ type: "body", parameters: bodyParameters });
  }
  if (buttonComponents) {
    for (const b of buttonComponents) components.push(b);
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

// ─── Placeholder extraction ───────────────────────────────────────────────
// Meta supports two parameter formats; templates pick one:
//   POSITIONAL: {{1}}, {{2}} → params are {type, text}
//   NAMED:      {{name}}, {{phone}} → params are {type, parameter_name, text}

export type Placeholders =
  | { kind: "none" }
  | { kind: "positional"; max: number }
  | { kind: "named"; names: string[] };

export function extractPlaceholders(text: string): Placeholders {
  if (!text) return { kind: "none" };
  const positional = text.match(/\{\{(\d+)\}\}/g);
  const named = text.match(/\{\{([a-zA-Z_]\w*)\}\}/g);
  if (positional && positional.length > 0) {
    let max = 0;
    for (const m of positional) {
      const n = parseInt(m.slice(2, -2), 10);
      if (n > max) max = n;
    }
    return { kind: "positional", max };
  }
  if (named && named.length > 0) {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const m of named) {
      const name = m.slice(2, -2);
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    return { kind: "named", names };
  }
  return { kind: "none" };
}

// ─── Customer-field mapping (single source of truth for sender + preview) ──

export function valueForName(name: string, customer: Record<string, unknown>): string {
  const fullName = ((customer.name as string) ?? "").trim();
  const firstName = fullName.split(/\s+/)[0] || "there";
  switch (name.toLowerCase()) {
    case "name":
    case "customer_name":
    case "first_name":
      return firstName;
    case "full_name":
      return fullName || "there";
    case "phone":
      return (customer.phone as string) ?? "";
    case "instagram":
    case "ig":
      return (customer.instagram as string) ?? "";
    case "studio":
      return "PSY Tattoos";
    default:
      return "";
  }
}

export function valueForIndex(index: number, customer: Record<string, unknown>): string {
  const fullName = ((customer.name as string) ?? "").trim();
  const firstName = fullName.split(/\s+/)[0] || "there";
  switch (index) {
    case 1:
      return firstName;
    case 2:
      return (customer.phone as string) ?? "";
    case 3:
      return (customer.instagram as string) ?? "";
    default:
      return "";
  }
}

function buildParamsFor(p: Placeholders, customer: Record<string, unknown>): Array<Record<string, string>> | undefined {
  if (p.kind === "none") return undefined;
  if (p.kind === "positional") {
    return Array.from({ length: p.max }, (_, i) => ({
      type: "text",
      text: valueForIndex(i + 1, customer),
    }));
  }
  return p.names.map((name) => ({
    type: "text",
    parameter_name: name,
    text: valueForName(name, customer),
  }));
}

// ─── Template analyzer ─────────────────────────────────────────────────────

type TemplateShape = {
  body: Placeholders;
  header: Placeholders;
  hasMediaHeader: boolean;
  buttons: Array<{ index: number; placeholders: Placeholders }>;
  format: "POSITIONAL" | "NAMED" | "MIXED" | "NONE";
};

function deriveFormat(shape: { body: Placeholders; header: Placeholders; buttons: Array<{ placeholders: Placeholders }> }): TemplateShape["format"] {
  const all: Placeholders[] = [shape.body, shape.header, ...shape.buttons.map((b) => b.placeholders)];
  let hasNamed = false;
  let hasPositional = false;
  for (const p of all) {
    if (p.kind === "named") hasNamed = true;
    if (p.kind === "positional") hasPositional = true;
  }
  if (hasNamed && hasPositional) return "MIXED";
  if (hasNamed) return "NAMED";
  if (hasPositional) return "POSITIONAL";
  return "NONE";
}

function analyzeTemplate(template: Record<string, unknown>): { ok: boolean; shape: TemplateShape; error?: string } {
  const components = (template.components as Array<Record<string, unknown>>) ?? [];
  const shape: TemplateShape = {
    body: { kind: "none" },
    header: { kind: "none" },
    hasMediaHeader: false,
    buttons: [],
    format: "NONE",
  };

  for (const comp of components) {
    const type = (comp.type as string) ?? "";
    if (type === "BODY") {
      shape.body = extractPlaceholders((comp.text as string) ?? "");
    } else if (type === "HEADER") {
      const format = (comp.format as string | undefined) ?? "TEXT";
      if (format === "IMAGE" || format === "VIDEO" || format === "DOCUMENT") {
        shape.hasMediaHeader = true;
      } else {
        shape.header = extractPlaceholders((comp.text as string) ?? "");
      }
    } else if (type === "BUTTONS") {
      const buttons = (comp.buttons as Array<Record<string, unknown>>) ?? [];
      buttons.forEach((b, idx) => {
        if ((b.type as string) === "URL") {
          const ph = extractPlaceholders((b.url as string) ?? "");
          if (ph.kind !== "none") shape.buttons.push({ index: idx, placeholders: ph });
        }
      });
    }
  }

  if (shape.hasMediaHeader) {
    return {
      ok: false,
      shape,
      error:
        "Template has a media header (IMAGE/VIDEO/DOCUMENT). This sender does not support media templates — use a text-only template.",
    };
  }

  // Prefer Meta-supplied parameter_format when present, fall back to derived from text scan
  const metaFormat = template.parameter_format as string | undefined;
  if (metaFormat === "NAMED" || metaFormat === "POSITIONAL") {
    shape.format = metaFormat;
  } else {
    shape.format = deriveFormat(shape);
  }

  if (shape.format === "MIXED") {
    return {
      ok: false,
      shape,
      error: "Template mixes named and positional placeholders — not supported.",
    };
  }

  return { ok: true, shape };
}

export async function sendBatchTemplate(
  customers: Array<Record<string, unknown>>,
  template: Record<string, unknown>,
  languageCode = "en"
) {
  const results: Array<Record<string, unknown>> = [];
  const templateName = (template.name as string) ?? "";

  const analysis = analyzeTemplate(template);
  if (!analysis.ok) {
    for (const customer of customers) {
      results.push({
        customer_id: customer.id,
        customer_name: (customer.name as string) ?? "Unknown",
        phone: (customer.phone as string) ?? "",
        success: false,
        error: analysis.error,
      });
    }
    return results;
  }

  const { shape } = analysis;

  for (const customer of customers) {
    const phone = (customer.phone as string) ?? "";
    const name = (customer.name as string) ?? "Unknown";

    if (!phone) {
      results.push({ customer_id: customer.id, customer_name: name, phone, success: false, error: "No phone number" });
      continue;
    }

    const bodyParams = buildParamsFor(shape.body, customer);
    const headerParams = buildParamsFor(shape.header, customer);

    const buttonComponents: Array<Record<string, unknown>> | undefined =
      shape.buttons.length > 0
        ? shape.buttons.map(({ index, placeholders }) => ({
            type: "button",
            sub_type: "url",
            index: String(index),
            parameters: buildParamsFor(placeholders, customer) ?? [],
          }))
        : undefined;

    const result = await sendTemplateMessage(
      phone,
      templateName,
      languageCode,
      bodyParams,
      headerParams,
      buttonComponents
    );

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

  const url = `${config.baseUrl}/${config.wabaId}/message_templates?fields=name,language,category,status,components,parameter_format,rejected_reason,id&limit=100`;

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
      parameter_format: t.parameter_format ?? null,
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
      ...(extractPlaceholders(input.body).kind !== "none" ? { example: { body_text: [[example]] } } : {}),
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
