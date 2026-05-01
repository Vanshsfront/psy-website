import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getDailyNotes, createDailyNote } from "@/lib/storeadmin/server/database";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const dateFrom = params.get("date_from") || undefined;
  const dateTo = params.get("date_to") || undefined;
  const notes = await getDailyNotes(dateFrom, dateTo);
  return NextResponse.json({ notes });
}

export async function POST(request: NextRequest) {
  let username: string;
  try {
    username = await authenticateRequest(request);
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: { note_date?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const noteDate = (body.note_date || "").trim();
  const text = (body.body || "").trim();
  if (!noteDate || !/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
    return NextResponse.json({ detail: "note_date (YYYY-MM-DD) required" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ detail: "body required" }, { status: 400 });
  }

  const note = await createDailyNote({
    note_date: noteDate,
    body: text,
    author: username,
  });
  if (!note) {
    return NextResponse.json({ detail: "Failed to create note" }, { status: 500 });
  }
  return NextResponse.json({ created: true, note });
}
