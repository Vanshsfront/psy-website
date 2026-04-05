import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSSRClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const supabase = await createSSRClient();

    const { data, error } = await supabase
      .from("return_requests")
      .select(
        "*, orders:order_id(order_number), shop_customers:customer_id(name, email)"
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch return requests";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
