import { generateText, isLlmConfigured } from "./llm-provider";
import { nlFilterToQueryPrompt, genderInferencePrompt } from "./prompts";

interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

interface InferredField {
  field: string;
  source: string;
  operator: string;
  value: string;
}

interface FilterResult {
  success: boolean;
  conditions: FilterCondition[];
  inferred_fields: InferredField[];
  inference_caution: string | null;
  error: string | null;
  suggestion: string | null;
  raw_response: string;
}

export async function parseNlFilter(filterText: string): Promise<FilterResult> {
  if (!isLlmConfigured()) {
    return { success: false, conditions: [], inferred_fields: [], inference_caution: null, error: "AI provider not configured", suggestion: null, raw_response: "" };
  }

  const today = new Date().toISOString().split("T")[0];
  const prompt = nlFilterToQueryPrompt(filterText, today);

  const rawResponse = await generateText(prompt, 800);

  if (!rawResponse || rawResponse.startsWith("AI error:")) {
    return { success: false, conditions: [], inferred_fields: [], inference_caution: null, error: rawResponse || "Empty AI response", suggestion: null, raw_response: rawResponse || "" };
  }

  return parseFilterResponse(rawResponse);
}

function parseFilterResponse(rawText: string): FilterResult {
  rawText = rawText.trim();

  if (rawText.includes("ERROR:")) {
    let errorLine = "";
    let suggestionLine = "";
    for (const line of rawText.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("ERROR:")) errorLine = trimmed.replace("ERROR:", "").trim();
      else if (trimmed.startsWith("SUGGESTION:")) suggestionLine = trimmed.replace("SUGGESTION:", "").trim();
    }
    return { success: false, conditions: [], inferred_fields: [], inference_caution: null, error: errorLine, suggestion: suggestionLine, raw_response: rawText };
  }

  const conditions: FilterCondition[] = [];
  const inferredFields: InferredField[] = [];
  const blocks = rawText.split("---");

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.includes("INFER:")) {
      const inferInfo: Partial<InferredField> = {};
      for (const line of trimmed.split("\n")) {
        const l = line.trim();
        if (!l || !l.includes(":")) continue;
        const colonIdx = l.indexOf(":");
        const key = l.slice(0, colonIdx).trim().toUpperCase();
        const value = l.slice(colonIdx + 1).trim();

        if (key === "INFER") inferInfo.field = value;
        else if (key === "FROM") inferInfo.source = value;
        else if (key === "CONDITION") {
          const parts = value.split(/\s+/, 2);
          if (parts.length === 2) {
            inferInfo.operator = parts[0].toLowerCase();
            inferInfo.value = parts[1];
          } else {
            inferInfo.operator = "eq";
            inferInfo.value = value;
          }
        }
      }
      if (inferInfo.field && inferInfo.source) {
        inferredFields.push(inferInfo as InferredField);
      }
      continue;
    }

    const condition: Partial<FilterCondition> = {};
    for (const line of trimmed.split("\n")) {
      const l = line.trim();
      if (!l || !l.includes(":")) continue;
      const colonIdx = l.indexOf(":");
      const key = l.slice(0, colonIdx).trim().toUpperCase();
      const value = l.slice(colonIdx + 1).trim();

      if (key === "FIELD") condition.field = value;
      else if (key === "OPERATOR") condition.operator = value.toLowerCase();
      else if (key === "VALUE") condition.value = value;
    }
    if (condition.field && condition.operator) {
      conditions.push(condition as FilterCondition);
    }
  }

  if (!conditions.length && !inferredFields.length) {
    return { success: false, conditions: [], inferred_fields: [], inference_caution: null, error: "Could not parse filter conditions from AI response", suggestion: "Try rephrasing your filter with simpler language.", raw_response: rawText };
  }

  let inferenceCaution: string | null = null;
  if (inferredFields.length) {
    const fieldNames = inferredFields.map((f) => f.field);
    const sourceNames = inferredFields.map((f) => f.source);
    inferenceCaution = `${fieldNames.join(", ")} was inferred from ${sourceNames.join(", ")} using AI. This is a best-guess and results may be inaccurate. Consider adding a dedicated field for more reliable filtering.`;
  }

  return { success: true, conditions, inferred_fields: inferredFields, inference_caution: inferenceCaution, error: null, suggestion: null, raw_response: rawText };
}

export function buildSupabaseQueryFromConditions(conditions: FilterCondition[]) {
  const simpleFilters: Array<[string, string, string]> = [];
  const computedFilters: Array<{ field: string; operator: string; value: string }> = [];

  for (const cond of conditions) {
    const field = cond.field;
    const op = cond.operator;
    const value = cond.value;

    if (field.startsWith("computed:")) {
      const computedField = field.replace("computed:", "");
      computedFilters.push({ field: computedField, operator: op, value });
    } else {
      const supabaseOpMap: Record<string, string> = { eq: "eq", neq: "neq", gt: "gt", gte: "gte", lt: "lt", lte: "lte", like: "ilike", in: "in_" };
      const mappedOp = supabaseOpMap[op] ?? "eq";

      if (op === "between" && value.includes(",")) {
        const [start, end] = value.split(",").map((s) => s.trim());
        simpleFilters.push([field, "gte", start]);
        simpleFilters.push([field, "lte", end]);
      } else if (op === "like") {
        simpleFilters.push([field, "ilike", `%${value}%`]);
      } else {
        simpleFilters.push([field, mappedOp, value]);
      }
    }
  }

  return { simple_filters: simpleFilters, computed_filters: computedFilters, needs_aggregation: computedFilters.length > 0 };
}

export async function runInference(customers: Array<Record<string, unknown>>, inferredFields: InferredField[]): Promise<Array<Record<string, unknown>>> {
  if (!isLlmConfigured() || !customers.length || !inferredFields.length) return customers;

  let result = customers;
  for (const inferSpec of inferredFields) {
    const field = inferSpec.field.toLowerCase();
    const source = inferSpec.source;
    const operator = inferSpec.operator;
    const targetValue = inferSpec.value.toLowerCase();

    if (field === "gender" && source === "name") {
      result = await inferGenderFromName(result, operator, targetValue);
    }
  }

  return result;
}

async function inferGenderFromName(
  customers: Array<Record<string, unknown>>,
  operator: string,
  targetValue: string
): Promise<Array<Record<string, unknown>>> {
  if (!customers.length) return [];

  const names = customers.map((c) => (c.name as string) ?? "Unknown");
  const namesList = names.map((name, i) => `${i + 1}. ${name}`).join("\n");

  const prompt = genderInferencePrompt(namesList);
  const raw = await generateText(prompt, 2000);

  if (raw.startsWith("AI error:")) {
    for (const c of customers) c._inferred_gender = "unknown";
    return customers;
  }

  const inferredGenders: string[] = [];
  for (const line of raw.trim().split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes("|")) continue;
    const parts = trimmed.split("|");
    if (parts.length >= 2) {
      let gender = parts[parts.length - 1].trim().toLowerCase();
      if (!["male", "female", "unknown"].includes(gender)) gender = "unknown";
      inferredGenders.push(gender);
    }
  }

  const result: Array<Record<string, unknown>> = [];
  for (let i = 0; i < customers.length; i++) {
    const gender = i < inferredGenders.length ? inferredGenders[i] : "unknown";
    customers[i]._inferred_gender = gender;

    if (operator === "eq" && gender === targetValue) result.push(customers[i]);
    else if (operator === "neq" && gender !== targetValue) result.push(customers[i]);
    else if (operator === "like" && targetValue.includes(gender)) result.push(customers[i]);
  }

  return result;
}
