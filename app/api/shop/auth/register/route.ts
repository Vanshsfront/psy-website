import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { hashPassword, createCustomerToken } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { detail: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, phone } = parsed.data;
    const supabase = createServiceClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from("shop_customers")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { detail: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const password_hash = hashPassword(password);

    const { data: customer, error } = await supabase
      .from("shop_customers")
      .insert({
        email: email.toLowerCase(),
        password_hash,
        name,
        phone: phone || null,
      })
      .select("id, email, name, phone")
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { detail: "Failed to create account" },
        { status: 500 }
      );
    }

    const token = await createCustomerToken(customer.id, customer.email);

    return NextResponse.json({ token, customer });
  } catch (e) {
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
