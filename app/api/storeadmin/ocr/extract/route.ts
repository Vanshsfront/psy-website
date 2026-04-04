import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { createOcrSession } from "@/lib/storeadmin/server/database";
import { extractOrdersFromImage } from "@/lib/storeadmin/server/ocr-utils";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "image/png";

    const result = await extractOrdersFromImage(buffer, contentType);

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error,
        orders: [],
        raw_text: result.raw_text || "",
      });
    }

    const session = await createOcrSession({
      extracted_fields: { orders: result.orders },
      confidence: result.orders.length > 0 ? Math.max(...result.orders.map((o) => o.confidence)) : 0,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      session_id: session.id,
      orders: result.orders,
      raw_text: result.raw_text,
    });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
