import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient, createServiceClient } from "@/lib/supabase-server";
import { extractPathFromUrl } from "@/lib/storage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("portfolio_items")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update portfolio item";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const supabase = createServiceClient();

    // First fetch the item to get the image URL for storage deletion
    const { data: item, error: fetchError } = await supabase
      .from("portfolio_items")
      .select("image_url")
      .eq("id", params.id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    // Delete the file from storage
    if (item?.image_url) {
      const storagePath = extractPathFromUrl(item.image_url);
      await supabase.storage.from("portfolio").remove([storagePath]);
    }

    // Delete the database row
    const { error: deleteError } = await supabase
      .from("portfolio_items")
      .delete()
      .eq("id", params.id);

    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete portfolio item";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
