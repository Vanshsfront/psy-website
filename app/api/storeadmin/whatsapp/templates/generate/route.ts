import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { generateText } from "@/lib/storeadmin/server/llm-provider";
import { templateGenerationPrompt, parseTemplateGeneration } from "@/lib/storeadmin/server/prompts";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const brief = body?.brief ? String(body.brief).trim() : "";
  if (!brief) {
    return NextResponse.json({ success: false, error: "brief is required" }, { status: 400 });
  }

  const raw = await generateText(templateGenerationPrompt(brief), 600);
  if (raw.startsWith("AI error:")) {
    return NextResponse.json({ success: false, error: raw.replace(/^AI error:\s*/, "") }, { status: 502 });
  }

  const parsed = parseTemplateGeneration(raw);
  if (!parsed.name || !parsed.category || !parsed.body) {
    return NextResponse.json(
      { success: false, error: "Could not parse AI response", raw },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    name: parsed.name,
    category: parsed.category,
    body: parsed.body,
    button_text: parsed.button_text,
    button_url: parsed.button_url,
  });
}
