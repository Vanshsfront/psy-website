import { NextRequest, NextResponse } from "next/server";
import { requireRoute, authErrorResponse } from "@/lib/storeadmin/server/auth";
import { deleteExpense } from "@/lib/storeadmin/server/database";

/**
 * Remove an expense entry.
 *
 * Yogesh asked for this because the only way to correct a mistyped expense was
 * to add an opposite entry cancelling it out, which left both rows in the
 * ledger and made the count and the category breakdown wrong.
 *
 * Open to the same people who can record an expense: whoever mistyped it should
 * be able to take it back. The row is kept and marked deleted, with who did it.
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRoute(request);
    const { id } = await ctx.params;
    await deleteExpense(id, me.username);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ detail: e.message }, { status: 404 });
    }
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
