import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { fetchTemplates, createTemplate } from "@/lib/storeadmin/server/whatsapp-utils";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const result = await fetchTemplates();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, category, language, body: text, button_text, button_url, example } = body;
  if (!name || !category || !text) {
    return NextResponse.json(
      { success: false, error: "name, category, and body are required" },
      { status: 400 },
    );
  }
  if ((button_text && !button_url) || (button_url && !button_text)) {
    return NextResponse.json(
      { success: false, error: "button_text and button_url must be provided together" },
      { status: 400 },
    );
  }

  const result = await createTemplate({
    name: String(name).trim(),
    category: String(category).toUpperCase(),
    language: language ? String(language).trim() : "en",
    body: String(text),
    button_text: button_text ? String(button_text).trim() : undefined,
    button_url: button_url ? String(button_url).trim() : undefined,
    example: example ? String(example).trim() : undefined,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
