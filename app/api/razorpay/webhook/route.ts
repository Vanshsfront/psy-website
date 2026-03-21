import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSSRClient } from '@/lib/supabase-server'

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const razorpayOrderId = payment.order_id
      const razorpayPaymentId = payment.id

      const supabase = await createSSRClient()

      // Update order status in Supabase
      // Using service role for webhooks would be better, but SSR client works if order RLS allows 
      // Admin update via Service Role Key
      const supabaseAdmin = require('@supabase/supabase-js').createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpayPaymentId,
        })
        .eq('razorpay_order_id', razorpayOrderId)

      if (error) {
        console.error("Webhook DB update failed:", error)
        return NextResponse.json({ error: "DB Update Failed" }, { status: 500 })
      }
      
      // TODO: Here send confirmation email via Resend API (Requirement noted)

      return NextResponse.json({ status: 'success' })
    }

    return NextResponse.json({ status: 'ignored' })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
