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
      // gemma-3-27b-it was discontinued by Google (API now 404s it). Gemma 4
      // (gemma-4-26b-a4b-it) is the intended replacement — identical SDK/endpoint,
      // only the model id changes — but the current key's GCP project is 403-denied
      // for gemma-4/gemini-2.5. Interim default is gemini-2.0-flash (allowed on this
      // project type). Once a fresh, un-flagged free key is in place, switch back via
      //   GOOGLE_TEXT_MODEL=gemma-4-26b-a4b-it
      // with no code change.
      model: process.env.GOOGLE_TEXT_MODEL || "gemini-2.0-flash",
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
