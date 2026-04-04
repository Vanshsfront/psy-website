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
      model: "gemma-3-27b-it",
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
