import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Razorpay from "razorpay"

export const dynamic = "force-dynamic"

// Validate required env vars at module level
const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer, items, subtotal, shippingCharge, total } = body

    // ── 1. Validate request body ──────────────────────────────────
    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!customer.name || !customer.email || !customer.phone || 
        !customer.address || !customer.city || !customer.state || !customer.pincode) {
      return NextResponse.json(
        { error: "Incomplete customer information" },
        { status: 400 }
      )
    }

    if (typeof total !== "number" || total <= 0) {
      return NextResponse.json(
        { error: "Invalid total amount" },
        { status: 400 }
      )
    }

    // ── 2. Validate stock availability ────────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })

    const productIds = items.map((item: any) => item.product_id)
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock_status, is_deleted")
      .in("id", productIds)

    if (productsError) {
      console.error("Stock check failed:", productsError)
      return NextResponse.json(
        { error: "Failed to verify product availability" },
        { status: 500 }
      )
    }

    // Verify all products exist, are in stock, and not deleted
    for (const item of items) {
      const product = products?.find((p: any) => p.id === item.product_id)
      if (!product) {
        return NextResponse.json(
          { error: `Product "${item.name}" is no longer available` },
          { status: 400 }
        )
      }
      if (!product.stock_status || product.is_deleted) {
        return NextResponse.json(
          { error: `"${product.name}" is currently out of stock` },
          { status: 400 }
        )
      }
    }

    // ── 3. Server-side price verification ─────────────────────────
    // Re-calculate total from DB prices to prevent price manipulation
    let serverSubtotal = 0
    for (const item of items) {
      const product = products?.find((p: any) => p.id === item.product_id)
      if (product) {
        serverSubtotal += Number(product.price) * item.quantity
      }
    }

    const serverShipping = serverSubtotal > 999 ? 0 : 99
    const serverTotal = serverSubtotal + serverShipping

    // Allow small floating-point difference (₹1 tolerance)
    if (Math.abs(serverTotal - total) > 1) {
      return NextResponse.json(
        { error: "Price mismatch detected. Please refresh and try again." },
        { status: 400 }
      )
    }

    // ── 4. Create order in database (status: pending) ─────────────
    const orderPayload = {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: {
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
      },
      items: items.map((item: any) => ({
        product_id: item.product_id,
        name: item.name,
        slug: item.slug,
        price: item.price,
        image_url: item.image_url,
        variant: item.variant,
        quantity: item.quantity,
      })),
      subtotal: serverSubtotal,
      shipping: serverShipping,
      total: serverTotal,
      status: "pending",
    }

    const { data: dbOrder, error: dbError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number")
      .single()

    if (dbError || !dbOrder) {
      console.error("DB order creation failed:", dbError)
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      )
    }

    // ── 5. Create Razorpay order ──────────────────────────────────
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || 
        RAZORPAY_KEY_ID === "rzp_test_yourkey" || 
        RAZORPAY_KEY_SECRET === "your_razorpay_secret") {
      // Razorpay not configured yet — return order without payment
      // Mark as "pending" and let admin manage manually
      return NextResponse.json({
        dbOrderId: dbOrder.id,
        orderNumber: dbOrder.order_number,
        amount: serverTotal * 100, // paise
        razorpayOrderId: null,
        paymentMode: "manual", // Flag for frontend to handle
      })
    }

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(serverTotal * 100), // Convert to paise
      currency: "INR",
      receipt: dbOrder.order_number,
      notes: {
        db_order_id: dbOrder.id,
        customer_email: customer.email,
      },
    })

    // ── 6. Update DB order with Razorpay order ID ─────────────────
    await supabase
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", dbOrder.id)

    return NextResponse.json({
      dbOrderId: dbOrder.id,
      orderNumber: dbOrder.order_number,
      amount: razorpayOrder.amount,
      razorpayOrderId: razorpayOrder.id,
      paymentMode: "razorpay",
    })
  } catch (err: any) {
    console.error("Create order error:", err)
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
