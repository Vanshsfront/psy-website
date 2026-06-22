import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("portfolio_styles")
      .delete()
      .eq("id", params.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete style";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
