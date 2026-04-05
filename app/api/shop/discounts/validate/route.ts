import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { code, subtotal } = await request.json();

    if (!code || subtotal == null) {
      return NextResponse.json(
        { valid: false, message: "Code and subtotal are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: discount, error } = await supabase
      .from("discounts")
      .select("*")
      .ilike("code", code)
      .eq("is_active", true)
      .single();

    if (error || !discount) {
      return NextResponse.json(
        { valid: false, message: "Invalid discount code" },
        { status: 200 }
      );
    }

    // Check if discount has started
    if (discount.starts_at && new Date(discount.starts_at) > new Date()) {
      return NextResponse.json(
        { valid: false, message: "Discount code is not yet active" },
        { status: 200 }
      );
    }

    // Check if discount has expired
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, message: "Discount code has expired" },
        { status: 200 }
      );
    }

    // Check max uses
    if (
      discount.max_uses !== null &&
      discount.used_count >= discount.max_uses
    ) {
      return NextResponse.json(
        { valid: false, message: "Discount code has reached its usage limit" },
        { status: 200 }
      );
    }

    // Check minimum order amount
    if (
      discount.min_order_amount !== null &&
      subtotal < discount.min_order_amount
    ) {
      return NextResponse.json(
        {
          valid: false,
          message: `Minimum order amount of $${discount.min_order_amount} required`,
        },
        { status: 200 }
      );
    }

    // Calculate discount amount
    let discount_amount: number;
    if (discount.type === "percentage") {
      discount_amount = subtotal * discount.value / 100;
    } else {
      discount_amount = discount.value;
    }

    // Cap at subtotal
    discount_amount = Math.min(discount_amount, subtotal);

    return NextResponse.json({
      valid: true,
      discount: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discount_amount,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to validate discount";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
