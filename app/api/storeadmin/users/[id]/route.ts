import { NextRequest, NextResponse } from "next/server";
import { requireRole, authErrorResponse, hashPassword } from "@/lib/storeadmin/server/auth";
import { updateUser, deleteUser, listUsers } from "@/lib/storeadmin/server/database";

/** Refuse to remove the last way into the system. */
async function wouldOrphanTheStudio(userId: string, nextRole?: string, nextActive?: boolean) {
  const users = await listUsers();
  const target = users.find((u) => (u as { id: string }).id === userId) as
    | { role: string; is_active: boolean }
    | undefined;
  if (!target) return false;

  const stillSuperadmin =
    (nextRole ?? target.role) === "superadmin" && (nextActive ?? target.is_active) !== false;
  if (stillSuperadmin) return false;

  const otherActiveSuperadmins = users.filter(
    (u) =>
      (u as { id: string }).id !== userId &&
      (u as { role: string }).role === "superadmin" &&
      (u as { is_active: boolean }).is_active !== false
  );
  return otherActiveSuperadmins.length === 0;
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole(request, "superadmin");
    const { id } = await ctx.params;
    const body = await request.json();

    const patch: Record<string, unknown> = {};
    if (body.role !== undefined) {
      if (!["superadmin", "admin", "artist"].includes(body.role)) {
        return NextResponse.json({ detail: "Invalid role" }, { status: 400 });
      }
      patch.role = body.role;
      patch.artist_id = body.role === "artist" ? (body.artist_id ?? null) : null;
      if (body.role === "artist" && !patch.artist_id) {
        return NextResponse.json(
          { detail: "Pick which artist this login belongs to" },
          { status: 400 }
        );
      }
    }
    if (body.artist_id !== undefined && patch.role === undefined) patch.artist_id = body.artist_id;
    if (body.is_active !== undefined) patch.is_active = !!body.is_active;
    if (body.password) {
      if (String(body.password).length < 8) {
        return NextResponse.json(
          { detail: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      patch.password_hash = hashPassword(String(body.password));
    }

    if (await wouldOrphanTheStudio(id, patch.role as string, patch.is_active as boolean)) {
      return NextResponse.json(
        { detail: "This is the last active owner account — promote someone else first" },
        { status: 409 }
      );
    }

    const user = await updateUser(id, patch);
    return NextResponse.json({ updated: true, user: { ...user, password_hash: undefined }, by: me.username });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, "superadmin");
    const { id } = await ctx.params;

    if (await wouldOrphanTheStudio(id, undefined, false)) {
      return NextResponse.json(
        { detail: "This is the last active owner account — promote someone else first" },
        { status: 409 }
      );
    }

    await deleteUser(id);
    return NextResponse.json({ deleted: true });
  } catch (e) {
    const { detail, status } = authErrorResponse(e);
    return NextResponse.json({ detail }, { status });
  }
}
