// Email utility — uses Resend if configured, otherwise logs
// Install: npm install resend

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.EMAIL_FROM || "PSY <noreply@psytattoos.com>"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL SKIPPED] No RESEND_API_KEY set. To: ${to}, Subject: ${subject}`)
    return
  }

  const { Resend } = await import("resend")
  const resend = new Resend(RESEND_API_KEY)

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  })
}

export async function sendOrderConfirmationEmail({
  to,
  customerName,
  orderNumber,
  total,
}: {
  to: string
  customerName: string
  orderNumber: string
  total: number
}) {
  await sendEmail({
    to,
    subject: `Order Confirmed — ${orderNumber}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F3EF; padding: 40px;">
        <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 8px;">PSY</h1>
        <div style="height: 1px; background: rgba(184,173,164,0.2); margin: 24px 0;"></div>
        <h2 style="font-size: 20px; font-weight: 300; margin-bottom: 16px;">Order Confirmed</h2>
        <p style="color: #B8ADA4; line-height: 1.6;">
          Hi ${customerName},<br><br>
          Your order <strong style="color: #F5F3EF;">${orderNumber}</strong> has been confirmed and payment received.
        </p>
        <div style="background: #111111; padding: 24px; margin: 24px 0;">
          <div style="display: flex; justify-content: space-between; color: #B8ADA4; font-size: 14px;">
            <span>Total Paid</span>
            <span style="color: #F5F3EF; font-weight: 500;">&#8377;${total}</span>
          </div>
        </div>
        <p style="color: #B8ADA4; font-size: 14px; line-height: 1.6;">
          We'll send you a shipping update once your order is on its way.
        </p>
        <div style="height: 1px; background: rgba(184,173,164,0.2); margin: 24px 0;"></div>
        <p style="color: #B8ADA4; font-size: 12px;">PSY Tattoos & Jewels</p>
      </div>
    `,
  })
}

export async function sendShippingNotificationEmail({
  to,
  customerName,
  orderNumber,
  courierName,
  trackingNumber,
}: {
  to: string
  customerName: string
  orderNumber: string
  courierName: string
  trackingNumber: string
}) {
  await sendEmail({
    to,
    subject: `Your Order ${orderNumber} Has Shipped`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F3EF; padding: 40px;">
        <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 8px;">PSY</h1>
        <div style="height: 1px; background: rgba(184,173,164,0.2); margin: 24px 0;"></div>
        <h2 style="font-size: 20px; font-weight: 300; margin-bottom: 16px;">Your Order Has Shipped</h2>
        <p style="color: #B8ADA4; line-height: 1.6;">
          Hi ${customerName},<br><br>
          Your order <strong style="color: #F5F3EF;">${orderNumber}</strong> is on its way.
        </p>
        <div style="background: #111111; padding: 24px; margin: 24px 0;">
          <p style="color: #B8ADA4; font-size: 14px; margin: 0 0 8px 0;">Courier: <strong style="color: #F5F3EF;">${courierName}</strong></p>
          <p style="color: #B8ADA4; font-size: 14px; margin: 0;">Tracking: <strong style="color: #F5F3EF;">${trackingNumber}</strong></p>
        </div>
        <div style="height: 1px; background: rgba(184,173,164,0.2); margin: 24px 0;"></div>
        <p style="color: #B8ADA4; font-size: 12px;">PSY Tattoos & Jewels</p>
      </div>
    `,
  })
}

export async function sendReturnStatusEmail({
  to,
  customerName,
  orderNumber,
  status,
}: {
  to: string
  customerName: string
  orderNumber: string
  status: string
}) {
  const statusMessages: Record<string, string> = {
    approved: "Your return request has been approved. Please ship the items back.",
    rejected: "Unfortunately, your return request could not be approved.",
    completed: "Your return has been processed and a refund has been initiated.",
  }

  await sendEmail({
    to,
    subject: `Return Update — ${orderNumber}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #F5F3EF; padding: 40px;">
        <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.1em; margin-bottom: 8px;">PSY</h1>
        <div style="height: 1px; background: rgba(184,173,164,0.2); margin: 24px 0;"></div>
        <h2 style="font-size: 20px; font-weight: 300; margin-bottom: 16px;">Return Update</h2>
        <p style="color: #B8ADA4; line-height: 1.6;">
          Hi ${customerName},<br><br>
          ${statusMessages[status] || `Your return request for order ${orderNumber} has been updated to: ${status}.`}
        </p>
        <div style="height: 1px; background: rgba(184,173,164,0.2); margin: 24px 0;"></div>
        <p style="color: #B8ADA4; font-size: 12px;">PSY Tattoos & Jewels</p>
      </div>
    `,
  })
}
