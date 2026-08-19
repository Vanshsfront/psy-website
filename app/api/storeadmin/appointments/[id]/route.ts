import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import {
  updateAppointment,
  completeAppointment,
  deleteAppointment,
} from "@/lib/storeadmin/server/database";

/** Artists are scoped to their own row; staff see everything. */
function scopeFor(role: string, artistId: string | null) {
  return role === "artist" ? artistId : null;
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRoute(request);
    const { id } = await ctx.params;
    const body = await request.json();
    const scope = scopeFor(me.role, me.artistId);

    // Completion is its own operation because it has to create the order too.
    if (body.status === "completed") {
      const result = await completeAppointment(
        id,
        { total: body.total, payment_mode: body.payment_mode, consent_signed: body.consent_signed },
        scope
      );
      return NextResponse.json({ updated: true, ...result });
    }

    // An artist must not be able to hand their appointment to someone else.
    if (me.role === "artist") delete body.artist_id;

    const appointment = await updateAppointment(id, body, scope);
    return NextResponse.json({ updated: true, appointment });
  } catch (e) {
    // "not found" is an answer, not a fault. An appointment outside an
    // artist's scope is reported the same way as one that does not exist,
    // deliberately, so the response cannot confirm somebody else's booking.
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ detail: e.message }, { status: 404 });
    }
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRoute(request);
    const { id } = await ctx.params;
    await deleteAppointment(id, me.username, scopeFor(me.role, me.artistId));
    // Soft delete: the row leaves every view but the studio keeps the history.
    return NextResponse.json({ deleted: true });
  } catch (e) {
    // "not found" is an answer, not a fault. An appointment outside an
    // artist's scope is reported the same way as one that does not exist,
    // deliberately, so the response cannot confirm somebody else's booking.
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ detail: e.message }, { status: 404 });
    }
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
