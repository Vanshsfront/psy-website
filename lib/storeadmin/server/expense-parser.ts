import { generateText, isLlmConfigured } from "./llm-provider";
import { expenseParsePrompt } from "./prompts";

const VALID_CATEGORIES = new Set([
  "supplies", "rent", "utilities", "equipment",
  "marketing", "salary", "maintenance", "other",
]);

export async function parseExpense(expenseText: string) {
  if (!isLlmConfigured()) {
    return { success: false, fields: {}, error: "AI provider not configured", raw_response: "" };
  }

  const today = new Date().toISOString().split("T")[0];
  const prompt = expenseParsePrompt(expenseText, today);

  const rawResponse = await generateText(prompt, 500);

  if (!rawResponse || rawResponse.startsWith("AI error:")) {
    return { success: false, fields: {}, error: rawResponse || "Empty AI response", raw_response: rawResponse || "" };
  }

  return parseExpenseResponse(rawResponse, expenseText);
}

function parseExpenseResponse(rawText: string, originalInput: string) {
  const today = new Date().toISOString().split("T")[0];
  const fields: Record<string, unknown> = {
    amount: 0,
    category: "other",
    description: "",
    vendor: "UNKNOWN",
    payment_mode: "other",
    date: today,
    raw_input: originalInput,
  };

  for (const line of rawText.trim().split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(":")) continue;

    const colonIdx = trimmed.indexOf(":");
    const key = trimmed.slice(0, colonIdx).trim().toUpperCase();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (key === "AMOUNT") {
      const numStr = value.replace(/[^\d.]/g, "");
      fields.amount = parseFloat(numStr) || 0;
    } else if (key === "CATEGORY") {
      const cat = value.toLowerCase().trim();
      fields.category = VALID_CATEGORIES.has(cat) ? cat : "other";
    } else if (key === "DESCRIPTION") {
      fields.description = value;
    } else if (key === "VENDOR") {
      fields.vendor = value.toUpperCase() !== "UNKNOWN" ? value : "UNKNOWN";
    } else if (key === "PAYMENT_MODE") {
      fields.payment_mode = value.toLowerCase().trim();
    } else if (key === "DATE") {
      // Validate YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        fields.date = value;
      }
    }
  }

  if ((fields.amount as number) <= 0) {
    return { success: false, fields, error: "Could not extract a valid amount from the input", raw_response: rawText };
  }

  return { success: true, fields, error: null, raw_response: rawText };
}
