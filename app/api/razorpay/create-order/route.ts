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
    const { customer, items, subtotal, shippingCharge, total, discountCode, customerId } = body

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
      .select("id, name, price, stock_status, stock_quantity, is_deleted")
      .in("id", productIds)

    if (productsError) {
      console.error("Stock check failed:", productsError)
      return NextResponse.json(
        { error: "Failed to verify product availability" },
        { status: 500 }
      )
    }

    const variantIds = items
      .map((item: any) => item.variant_id)
      .filter((id: any): id is string => typeof id === "string" && id.length > 0)

    let variantRows: Array<{ id: string; product_id: string; stock_quantity: number }> = []
    if (variantIds.length > 0) {
      const { data: rows, error: variantsError } = await supabase
        .from("product_variants")
        .select("id, product_id, stock_quantity")
        .in("id", variantIds)
      if (variantsError) {
        console.error("Variant stock check failed:", variantsError)
        return NextResponse.json(
          { error: "Failed to verify variant availability" },
          { status: 500 }
        )
      }
      variantRows = rows || []
    }

    // Verify each cart item: product must exist, be available, and have enough stock.
    // When the item has a variant_id, per-variant stock governs; otherwise fall back
    // to product-level stock.
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

      if (item.variant_id) {
        const row = variantRows.find(
          (v) => v.id === item.variant_id && v.product_id === item.product_id
        )
        if (!row) {
          return NextResponse.json(
            { error: `Selected option for "${product.name}" is no longer available` },
            { status: 400 }
          )
        }
        const avail = row.stock_quantity ?? 0
        if (avail <= 0) {
          return NextResponse.json(
            { error: `"${product.name}" is sold out` },
            { status: 400 }
          )
        }
        if (item.quantity > avail) {
          return NextResponse.json(
            { error: `Only ${avail} units of "${product.name}" available` },
            { status: 400 }
          )
        }
      } else {
        const avail = product.stock_quantity ?? 0
        if (avail <= 0) {
          return NextResponse.json(
            { error: `"${product.name}" is sold out` },
            { status: 400 }
          )
        }
        if (item.quantity > avail) {
          return NextResponse.json(
            { error: `Only ${avail} units of "${product.name}" available` },
            { status: 400 }
          )
        }
      }
    }

    // ── 3. Server-side price verification ─────────────────────────
    let serverSubtotal = 0
    for (const item of items) {
      const product = products?.find((p: any) => p.id === item.product_id)
      if (product) {
        serverSubtotal += Number(product.price) * item.quantity
      }
    }

    // ── 4. Validate and apply discount ────────────────────────────
    let discountAmount = 0
    let validatedDiscountCode: string | null = null

    if (discountCode) {
      const { data: discount } = await supabase
        .from("discounts")
        .select("*")
        .ilike("code", discountCode)
        .eq("is_active", true)
        .single()

      if (discount) {
        const now = new Date()
        const isValid =
          (!discount.expires_at || new Date(discount.expires_at) > now) &&
          (!discount.starts_at || new Date(discount.starts_at) <= now) &&
          (!discount.max_uses || discount.used_count < discount.max_uses) &&
          (!discount.min_order_amount || serverSubtotal >= Number(discount.min_order_amount))

        if (isValid) {
          if (discount.type === "percentage") {
            discountAmount = Math.min(serverSubtotal, serverSubtotal * Number(discount.value) / 100)
          } else {
            discountAmount = Math.min(serverSubtotal, Number(discount.value))
          }
          validatedDiscountCode = discount.code

          // Increment used_count
          await supabase
            .from("discounts")
            .update({ used_count: discount.used_count + 1 })
            .eq("id", discount.id)
        }
      }
    }

    const discountedSubtotal = serverSubtotal - discountAmount
    const serverShipping = discountedSubtotal > 999 ? 0 : 99
    const serverTotal = discountedSubtotal + serverShipping

    // Allow small floating-point difference (₹1 tolerance)
    if (Math.abs(serverTotal - total) > 1) {
      return NextResponse.json(
        { error: "Price mismatch detected. Please refresh and try again." },
        { status: 400 }
      )
    }

    // ── 5. Decrement inventory ────────────────────────────────────
    // When a variant_id is present, decrement the variant row only — other
    // variants of the same product may still have stock, so don't flip the
    // product's stock_status. When no variant, decrement product-level stock
    // and auto-flip stock_status when it hits zero.
    for (const item of items) {
      if (item.variant_id) {
        const row = variantRows.find(
          (v) => v.id === item.variant_id && v.product_id === item.product_id
        )
        if (row) {
          const newQty = Math.max(0, (row.stock_quantity ?? 0) - item.quantity)
          await supabase
            .from("product_variants")
            .update({ stock_quantity: newQty })
            .eq("id", row.id)
        }
        continue
      }
      const product = products?.find((p: any) => p.id === item.product_id)
      if (product) {
        const newQty = Math.max(0, (product.stock_quantity ?? 0) - item.quantity)
        await supabase
          .from("products")
          .update({
            stock_quantity: newQty,
            stock_status: newQty > 0,
          })
          .eq("id", item.product_id)
      }
    }

    // ── 6. Create order in database (status: pending) ─────────────
    const orderPayload: Record<string, any> = {
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
        variant_id: item.variant_id || null,
        quantity: item.quantity,
      })),
      subtotal: serverSubtotal,
      shipping: serverShipping,
      total: serverTotal,
      status: "pending",
      discount_code: validatedDiscountCode,
      discount_amount: discountAmount,
    }

    if (customerId) {
      orderPayload.customer_id = customerId
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

    // ── 7. Create Razorpay order ──────────────────────────────────
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET ||
        RAZORPAY_KEY_ID === "rzp_test_yourkey" ||
        RAZORPAY_KEY_SECRET === "your_razorpay_secret") {
      return NextResponse.json({
        dbOrderId: dbOrder.id,
        orderNumber: dbOrder.order_number,
        amount: serverTotal * 100,
        razorpayOrderId: null,
        paymentMode: "manual",
      })
    }

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(serverTotal * 100),
      currency: "INR",
      receipt: dbOrder.order_number,
      notes: {
        db_order_id: dbOrder.id,
        customer_email: customer.email,
      },
    })

    // ── 8. Update DB order with Razorpay order ID ─────────────────
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
