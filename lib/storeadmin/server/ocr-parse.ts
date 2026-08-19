// Shared parsing for the `=== ORDER N ===` block format that
// OCR_FORM_EXTRACTION_PROMPT asks for. Provider-agnostic so the Gemini and
// Gemma backends produce identical shapes downstream.

const FIELD_MAP: Record<string, string> = {
  CONFIDENCE: "confidence",
  DATE: "date",
  ARTIST: "artist",
  CUSTOMER_NAME: "customer_name",
  PHONE: "phone",
  INSTAGRAM: "instagram",
  SERVICE: "service_description",
  PAYMENT_MODE: "payment_mode",
  DEPOSIT: "deposit",
  TOTAL: "total",
  COMMENTS: "comments",
  SOURCE: "source",
};

export interface OcrOrder {
  confidence: number;
  fields: Record<string, unknown>;
}

export interface OcrResult {
  orders: OcrOrder[];
  raw_text: string;
  error: string | null;
}

function parseSingleOrderBlock(text: string): OcrOrder {
  const fields: Record<string, unknown> = {};
  let confidence = 0;

  for (const line of text.trim().split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(":")) continue;

    const colonIdx = trimmed.indexOf(":");
    const key = trimmed.slice(0, colonIdx).trim().toUpperCase();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (key in FIELD_MAP) {
      const mappedKey = FIELD_MAP[key];
      if (mappedKey === "confidence") {
        const numMatch = value.replace(/[^\d.]/g, "");
        confidence = parseFloat(numMatch) || 0;
      } else if (value.toUpperCase() === "MISSING") {
        fields[mappedKey] = null;
      } else if (mappedKey === "deposit" || mappedKey === "total") {
        const numStr = value.replace(/[^\d.]/g, "");
        fields[mappedKey] = parseFloat(numStr) || 0;
      } else {
        fields[mappedKey] = value;
      }
    }
  }

  return { confidence, fields };
}

export function parseMultiOcrResponse(rawText: string): OcrResult {
  const orderPattern = /===\s*ORDER\s+\d+\s*===/gi;
  const parts = rawText.split(orderPattern);

  if (parts.length <= 1) {
    const single = parseSingleOrderBlock(rawText);
    if (Object.keys(single.fields).length > 0) {
      return { orders: [single], raw_text: rawText, error: null };
    }
    return { orders: [], raw_text: rawText, error: null };
  }

  const orders: OcrOrder[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const parsed = parseSingleOrderBlock(trimmed);
    if (Object.keys(parsed.fields).length > 0) {
      orders.push(parsed);
    }
  }

  return { orders, raw_text: rawText, error: null };
}
