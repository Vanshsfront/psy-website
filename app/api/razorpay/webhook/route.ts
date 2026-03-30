import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = "force-dynamic"

// Service-role client for webhook ops (bypasses RLS)
function createWebhookClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error('Webhook signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const razorpayOrderId = payment.order_id
      const razorpayPaymentId = payment.id

      const supabase = createWebhookClient()

      // Update order: mark as paid, store payment ID
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpayPaymentId,
        })
        .eq('razorpay_order_id', razorpayOrderId)
        .select('id, order_number, customer_email, customer_name')
        .single()

      if (error) {
        console.error("Webhook DB update failed:", error)
        return NextResponse.json({ error: "DB Update Failed" }, { status: 500 })
      }

      console.log(`✅ Order ${data?.order_number} marked as paid (${razorpayPaymentId})`)

      // TODO: Send confirmation email via Resend API
      // await sendOrderConfirmationEmail(data)

      return NextResponse.json({ status: 'success', orderId: data?.id })
    }

    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity
      const razorpayOrderId = payment.order_id

      const supabase = createWebhookClient()

      // Log failed payment (keep status as pending)
      console.error(`❌ Payment failed for Razorpay order: ${razorpayOrderId}`)

      return NextResponse.json({ status: 'payment_failed_logged' })
    }

    // Unhandled event type — acknowledge it
    return NextResponse.json({ status: 'ignored', event: event.event })

  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
