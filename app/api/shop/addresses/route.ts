import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/shop-auth";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("customer_id", customer.id)
      .order("is_default", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch addresses";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { label, address, city, state, pincode, is_default } =
      await request.json();

    if (!address || !city || !state || !pincode) {
      return NextResponse.json(
        { error: "address, city, state, and pincode are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset all other defaults for this customer
    if (is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("customer_id", customer.id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({
        customer_id: customer.id,
        label: label || null,
        address,
        city,
        state,
        pincode,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create address";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Address id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("customer_id", customer.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete address";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
