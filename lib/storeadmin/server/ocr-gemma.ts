import { OCR_FORM_EXTRACTION_PROMPT } from "./prompts";
import { parseMultiOcrResponse, type OcrResult } from "./ocr-parse";

// Self-hosted Gemma 4 vision OCR, served by Ollama on the same VPS as this app.
// Ollama binds to 127.0.0.1 only, so this is a loopback call in production and
// needs an SSH tunnel (-L 11434:127.0.0.1:11434) for local dev.
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_OCR_MODEL = process.env.OLLAMA_OCR_MODEL || "gemma4:e2b-it-qat";

// CPU-only inference on an 8-vCPU box runs ~11 tok/s, and a full-page form can
// take >150s. Generous default, overridable for slower/faster hardware.
const TIMEOUT_MS = Number(process.env.OLLAMA_OCR_TIMEOUT_MS || 240_000);

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
  done_reason?: string;
  eval_count?: number;
  prompt_eval_count?: number;
  total_duration?: number;
}

/**
 * Gemma 4 emits duplicate order blocks when it cannot ground the image well
 * (observed on full-resolution phone photos: the same row repeated until the
 * token budget ran out). Collapse byte-identical field sets, keeping the first.
 */
function dedupeOrders<T extends { fields: Record<string, unknown> }>(orders: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const order of orders) {
    const key = JSON.stringify(order.fields);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(order);
  }
  return out;
}

export async function extractOrdersWithGemma(
  imageBytes: Buffer,
  _mimeType = "image/png"
): Promise<OcrResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_OCR_MODEL,
        prompt: OCR_FORM_EXTRACTION_PROMPT,
        // Ollama takes bare base64 — no data: prefix, no mime type.
        images: [imageBytes.toString("base64")],
        stream: false,
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || "5m",
        // REQUIRED. Gemma 4 is a thinking model; with think left on, Ollama
        // routes every generated token into a reasoning channel it then drops,
        // and `.response` comes back empty with done_reason "length".
        think: false,
        options: {
          temperature: 0.1,
          num_predict: 1200,
          // Default 4096 is not enough once the CLIP projector's image tokens
          // are prepended to a ~600-token prompt.
          num_ctx: 8192,
        },
      }),
    });

    if (!res.ok) {
      return { orders: [], raw_text: "", error: `Ollama HTTP ${res.status}: ${await res.text()}` };
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    if (data.error) {
      return { orders: [], raw_text: "", error: `Ollama: ${data.error}` };
    }

    const rawText = (data.response || "").trim();
    if (!rawText) {
      return {
        orders: [],
        raw_text: "",
        error:
          data.done_reason === "length"
            ? "Gemma returned no text (hit the token cap). Check that think:false is set."
            : "Empty OCR response from Gemma",
      };
    }

    const parsed = parseMultiOcrResponse(rawText);
    return { ...parsed, orders: dedupeOrders(parsed.orders) };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { orders: [], raw_text: "", error: `Gemma OCR timed out after ${TIMEOUT_MS}ms` };
    }
    return { orders: [], raw_text: "", error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function isGemmaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
