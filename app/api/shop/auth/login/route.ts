import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyPassword, createCustomerToken } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: customer, error } = await supabase
      .from("shop_customers")
      .select("id, email, name, phone, password_hash")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { detail: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, customer.password_hash)) {
      return NextResponse.json(
        { detail: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createCustomerToken(customer.id, customer.email);

    return NextResponse.json({
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
