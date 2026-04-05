import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase-server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createDiscountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive("Value must be greater than 0"),
  min_order_amount: z.number().nullable().optional(),
  max_uses: z.number().int().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("discounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch discounts";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const parsed = createDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 400 },
        { status: 400 }
      );
    }

    const discountData = {
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
    };

    const { data, error } = await supabase
      .from("discounts")
      .insert(discountData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create discount";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
