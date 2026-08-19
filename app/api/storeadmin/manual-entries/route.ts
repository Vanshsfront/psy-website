import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import {
  getManualEntries,
  createManualEntry,
  deleteManualEntry,
} from "@/lib/storeadmin/server/database";

/**
 * Hand-entered lines on the salary slips and the balance sheet.
 *
 * Admin only, as Yogesh asked ("admin access only"), because these change what
 * people are paid and what the studio reports as profit.
 */

const SCOPES = new Set(["salary", "balance_sheet"]);
const KINDS_FOR_SCOPE: Record<string, string[]> = {
  salary: ["bonus", "deduction"],
  balance_sheet: ["income", "expense"],
};

export async function GET(request: NextRequest) {
  try {
    await requireRoute(request);
    const p = request.nextUrl.searchParams;
    const scope = p.get("scope") || "";
    if (!SCOPES.has(scope)) {
      return NextResponse.json({ detail: "Unknown scope" }, { status: 400 });
    }
    const entries = await getManualEntries({
      scope: scope as "salary" | "balance_sheet",
      from: p.get("from") || "",
      to: p.get("to") || "",
    });
    return NextResponse.json({ entries });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const body = await request.json();

    if (!SCOPES.has(body.scope)) {
      return NextResponse.json({ detail: "Unknown scope" }, { status: 400 });
    }
    if (!KINDS_FOR_SCOPE[body.scope].includes(body.kind)) {
      return NextResponse.json(
        { detail: `A ${body.scope} line must be one of: ${KINDS_FOR_SCOPE[body.scope].join(", ")}` },
        { status: 400 }
      );
    }
    if (body.scope === "salary" && !body.artist_id) {
      return NextResponse.json({ detail: "Pick who this is for" }, { status: 400 });
    }
    if (!body.label || !String(body.label).trim()) {
      return NextResponse.json({ detail: "Give this line a label" }, { status: 400 });
    }
    if (!body.entry_date) {
      return NextResponse.json({ detail: "Pick a date" }, { status: 400 });
    }
    const magnitude = Math.abs(Number(body.amount) || 0);
    if (magnitude === 0) {
      return NextResponse.json({ detail: "Enter an amount" }, { status: 400 });
    }

    const entry = await createManualEntry(body, me.username);
    return NextResponse.json({ created: true, entry });
  } catch (e) {
    // authErrorResponse now distinguishes the two: only a real auth
    // failure is 401 or 403, anything else is 500 with the detail logged
    // rather than returned, because database errors quote table names.
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const me = await requireRoute(request);
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ detail: "Which line?" }, { status: 400 });
    await deleteManualEntry(id, me.username);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    // authErrorResponse now distinguishes the two: only a real auth
    // failure is 401 or 403, anything else is 500 with the detail logged
    // rather than returned, because database errors quote table names.
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
