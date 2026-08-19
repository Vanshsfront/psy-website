import { GoogleGenerativeAI } from "@google/generative-ai";
import { OCR_FORM_EXTRACTION_PROMPT } from "./prompts";
import { parseMultiOcrResponse, type OcrResult } from "./ocr-parse";
import { extractOrdersWithGemma } from "./ocr-gemma";

export type { OcrOrder, OcrResult } from "./ocr-parse";
export { parseMultiOcrResponse } from "./ocr-parse";

function getOcrClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  if (!apiKey) throw new Error("No GOOGLE_API_KEY — cannot perform OCR");
  return new GoogleGenerativeAI(apiKey);
}

export async function extractOrdersWithGemini(
  imageBytes: Buffer,
  mimeType = "image/png"
): Promise<OcrResult> {
  try {
    const client = getOcrClient();
    const model = client.getGenerativeModel({
      // Gemini Flash Lite for OCR/vision. Pinned to the "-latest" alias rather
      // than a dated snapshot: gemini-2.0-flash-lite was retired by Google and
      // started returning HTTP 404 "no longer available", which silently broke
      // every OCR extraction. Override via GOOGLE_OCR_MODEL=...
      model: process.env.GOOGLE_OCR_MODEL || "gemini-flash-lite-latest",
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

/**
 * OCR backend selection.
 *
 *   STOREADMIN_OCR_PROVIDER=gemini   (default) Google Gemini Flash Lite — hosted, fast, costs per call.
 *   STOREADMIN_OCR_PROVIDER=gemma    Self-hosted Gemma 4 via Ollama on this VPS — free, ~35-150s per
 *                                    image on CPU, noticeably weaker on handwriting. See ocr-gemma.ts.
 *
 * Both return the identical shape, so callers and the /storeadmin/ocr review UI
 * need no changes when switching.
 */
export async function extractOrdersFromImage(
  imageBytes: Buffer,
  mimeType = "image/png"
): Promise<OcrResult> {
  const provider = (process.env.STOREADMIN_OCR_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemma" || provider === "ollama") {
    return extractOrdersWithGemma(imageBytes, mimeType);
  }
  return extractOrdersWithGemini(imageBytes, mimeType);
}
