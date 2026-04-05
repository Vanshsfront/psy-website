import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import Link from "next/link"
import { PackageCheck, Truck } from "lucide-react"

export const revalidate = 0

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: { orderId: string }
}) {
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .single()

  if (error || !order) {
    notFound()
  }

  const isPaid = order.status === "paid" || order.status === "shipped" || order.status === "delivered"
  const isPending = order.status === "pending"

  return (
    <main className="min-h-screen bg-ink flex flex-col items-center justify-center py-24 px-6 animate-fade-in-up">
      <div className="max-w-xl w-full text-center">
        <div className="w-16 h-16 mx-auto bg-psy-green/10 flex items-center justify-center mb-8 rounded-[2px]">
          <PackageCheck className="w-8 h-8 text-psy-green" />
        </div>

        <h1 className="font-display font-light text-display-xl text-bone mb-4">
          {isPaid ? "Order Confirmed" : "Order Placed"}
        </h1>
        <p className="font-sans text-body text-taupe mb-12">
          Thank you,{" "}
          <span className="text-bone">{order.customer_name}</span>.{" "}
          {isPaid
            ? "Your payment has been received."
            : "Your order has been placed and is awaiting confirmation."}
        </p>

        <div className="bg-surface text-left p-8 mb-10">
          <div className="font-sans text-micro uppercase tracking-widest text-taupe mb-6 pb-4 border-b border-taupe/20 flex justify-between">
            <span>Order</span>
            <span className="text-bone">
              {order.order_number || order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Status badge */}
          <div className="flex justify-center mb-6">
            <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded ${
              isPaid ? "bg-psy-green/20 text-psy-green border border-psy-green/50" :
              isPending ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" :
              "bg-taupe/20 text-taupe border border-taupe/50"
            }`}>
              {order.status}
            </span>
          </div>

          <div className="space-y-4 mb-6">
            {order.items.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex justify-between items-center font-sans text-caption text-bone"
              >
                <div className="flex items-center gap-3">
                  <span className="text-taupe">{item.quantity}×</span>
                  <span className="line-clamp-1">{item.name}</span>
                </div>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-taupe/20 pt-4 space-y-2">
            <div className="flex justify-between font-sans text-caption text-taupe">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between font-sans text-caption text-psy-green">
                <span>Discount{order.discount_code ? ` (${order.discount_code})` : ""}</span>
                <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-sans text-caption text-taupe">
              <span>Shipping</span>
              <span>{Number(order.shipping) === 0 ? "FREE" : `₹${order.shipping}`}</span>
            </div>
            <div className="flex justify-between font-sans text-body text-bone mt-2 pt-2 border-t border-taupe/20">
              <span>Total</span>
              <span>₹{order.total}</span>
            </div>
          </div>

          {/* Tracking info (if shipped) */}
          {order.tracking_number && (
            <div className="mt-6 pt-4 border-t border-taupe/20">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-psy-green" />
                <span className="font-sans text-micro uppercase tracking-widest text-psy-green">
                  Tracking
                </span>
              </div>
              <p className="font-sans text-caption text-bone">
                {order.courier_name && <span className="text-taupe">{order.courier_name}: </span>}
                {order.tracking_number}
              </p>
            </div>
          )}
        </div>

        <p className="font-sans text-caption text-taupe mb-12">
          {isPaid
            ? <>A confirmation email has been sent to{" "}
                <span className="text-bone">{order.customer_email}</span>.</>
            : <>We&apos;ll send a confirmation to{" "}
                <span className="text-bone">{order.customer_email}</span> once your order is processed.</>
          }
        </p>

        <Link href="/shop">
          <button className="border border-psy-green bg-transparent text-psy-green uppercase tracking-widest text-caption py-3 px-8 rounded-[2px] hover:bg-psy-green hover:text-ink transition-all duration-[400ms] cursor-pointer">
            Return to Shop
          </button>
        </Link>
      </div>
    </main>
  )
}
