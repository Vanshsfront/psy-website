import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (_client) return _client;
  const apiKey = process.env.GOOGLE_API_KEY || "";
  if (!apiKey) return null;
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

export async function generateText(prompt: string, maxTokens = 1000): Promise<string> {
  const client = getClient();
  if (!client) return "AI error: GOOGLE_API_KEY not configured";
  try {
    const model = client.getGenerativeModel({
      // Gemini Flash Lite is the default for storeadmin AI text features (fast,
      // cheap). Pinned to the "-latest" alias: the previous default
      // gemini-2.0-flash-lite was retired and returns HTTP 404. The old note
      // about gemma-4/gemini-2.5 being 403-denied on this key is stale — both
      // are now available. Override with no code change via
      //   GOOGLE_TEXT_MODEL=...
      model: process.env.GOOGLE_TEXT_MODEL || "gemini-flash-lite-latest",
      generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return `AI error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export function isLlmConfigured(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}
