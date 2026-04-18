import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { deleteTemplate } from "@/lib/storeadmin/server/whatsapp-utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } },
) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const name = decodeURIComponent(params.name).trim();
  if (!name) {
    return NextResponse.json({ success: false, error: "Template name is required" }, { status: 400 });
  }

  const result = await deleteTemplate(name);
  const status = result.success
    ? 200
    : /not exist|not found/i.test(result.error ?? "")
      ? 404
      : 400;
  return NextResponse.json(result, { status });
}
