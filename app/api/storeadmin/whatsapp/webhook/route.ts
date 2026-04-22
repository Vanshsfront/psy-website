import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/storeadmin/server/database";

// Public route. Meta calls this with no auth header — verification is via the
// shared WHATSAPP_WEBHOOK_VERIFY_TOKEN on GET, and (optionally) X-Hub-Signature-256 on POST.
// Do NOT add authenticateRequest() here.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim();

  console.log("[wa-webhook] verify GET", { mode, tokenMatches: token === expected, hasExpected: !!expected });

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return new NextResponse("forbidden", { status: 403 });
}

type StatusEvent = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

type IncomingMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  timestamp?: string;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.warn("[wa-webhook] POST body not JSON");
    return NextResponse.json({ ok: true });
  }

  console.log("[wa-webhook] POST payload:\n" + JSON.stringify(body, null, 2));

  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: Record<string, unknown>; field?: string }> }> })
    ?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = (change.value ?? {}) as {
        statuses?: StatusEvent[];
        messages?: IncomingMessage[];
        metadata?: { display_phone_number?: string; phone_number_id?: string };
      };

      for (const status of value.statuses ?? []) {
        const errSummary = status.errors?.length
          ? status.errors.map((e) => `${e.code ?? "?"} ${e.title ?? ""}: ${e.message ?? ""} ${e.error_data?.details ?? ""}`.trim()).join(" | ")
          : null;

        console.log(
          `[wa-webhook] STATUS ${status.status?.toUpperCase()} wamid=${status.id} to=${status.recipient_id} ts=${status.timestamp}${errSummary ? " err=" + errSummary : ""}`
        );

        try {
          const update: Record<string, unknown> = { status: status.status };
          if (errSummary) update.error_message = errSummary;
          const { error } = await getDb()
            .from("message_logs")
            .update(update)
            .eq("whatsapp_message_id", status.id);
          if (error) console.warn("[wa-webhook] update failed:", error.message);
        } catch (e) {
          console.warn("[wa-webhook] update threw:", e instanceof Error ? e.message : String(e));
        }
      }

      for (const msg of value.messages ?? []) {
        console.log(
          `[wa-webhook] INBOUND from=${msg.from} type=${msg.type} text=${JSON.stringify(msg.text?.body ?? "")} wamid=${msg.id}`
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
