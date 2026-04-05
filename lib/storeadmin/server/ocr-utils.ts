import { GoogleGenerativeAI } from "@google/generative-ai";
import { OCR_FORM_EXTRACTION_PROMPT } from "./prompts";

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

function getOcrClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  if (!apiKey) throw new Error("No GOOGLE_API_KEY — cannot perform OCR");
  return new GoogleGenerativeAI(apiKey);
}

function parseSingleOrderBlock(text: string): { confidence: number; fields: Record<string, unknown> } {
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

function parseMultiOcrResponse(rawText: string): { orders: Array<{ confidence: number; fields: Record<string, unknown> }>; raw_text: string; error: string | null } {
  const orderPattern = /===\s*ORDER\s+\d+\s*===/gi;
  const parts = rawText.split(orderPattern);

  if (parts.length <= 1) {
    const single = parseSingleOrderBlock(rawText);
    if (Object.keys(single.fields).length > 0) {
      return { orders: [single], raw_text: rawText, error: null };
    }
    return { orders: [], raw_text: rawText, error: null };
  }

  const orders: Array<{ confidence: number; fields: Record<string, unknown> }> = [];
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

export async function extractOrdersFromImage(imageBytes: Buffer, mimeType = "image/png") {
  try {
    const client = getOcrClient();
    const model = client.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.1, maxOutputTokens: 8000 },
    });

    const base64Data = imageBytes.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      OCR_FORM_EXTRACTION_PROMPT,
    ]);

    const rawText = result.response.text()?.trim() || "";
    if (!rawText) {
      return { orders: [], raw_text: "", error: "Empty OCR response" };
    }

    return parseMultiOcrResponse(rawText);
  } catch (e) {
    return { orders: [], raw_text: "", error: e instanceof Error ? e.message : String(e) };
  }
}
