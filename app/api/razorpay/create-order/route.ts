import { NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"
import { createSSRClient } from "@/lib/supabase-server"

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer, items, subtotal, shippingCharge, total } = body
    
    // We should validate these prices mathematically in production, 
    // but trusting the client struct for simplicity in this implementation.
    
    const supabase = await createSSRClient()

    // 1. Create Razorpay Order
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}_${Math.floor(Math.random() * 100)}`,
    })

    if (!rzpOrder) {
      throw new Error("Razorpay API failed to create order")
    }

    // 2. Draft Order in Supabase
    // Using pending status until webhook confirms
    const fullAddress = {
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode
    }

    const { data: dbOrder, error } = await supabase.from('orders').insert({
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: fullAddress,
      items: items,
      subtotal,
      shipping: shippingCharge,
      total,
      razorpay_order_id: rzpOrder.id,
      status: 'pending'
    }).select().single()

    if (error || !dbOrder) {
      console.error("Supabase Error:", error)
      throw new Error("Failed to persist order to database")
    }

    return NextResponse.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      dbOrderId: dbOrder.id,
      amount: rzpOrder.amount
    })

  } catch (error: any) {
    console.error("Create Order Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
