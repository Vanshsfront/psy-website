import { createSSRClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { PackageCheck } from "lucide-react"

export default async function OrderConfirmedPage({
  params,
}: {
  params: { orderId: string }
}) {
  const supabase = await createSSRClient()

  const supabaseAdmin = require("@supabase/supabase-js").createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .single()

  if (error || !order) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-ink flex flex-col items-center justify-center py-24 px-6 animate-fade-in-up">
      <div className="max-w-xl w-full text-center">
        <div className="w-16 h-16 mx-auto bg-psy-green/10 flex items-center justify-center mb-8 rounded-[2px]">
          <PackageCheck className="w-8 h-8 text-psy-green" />
        </div>

        <h1 className="font-display font-light text-display-xl text-bone mb-4">
          Order Confirmed
        </h1>
        <p className="font-sans text-body text-taupe mb-12">
          Thank you,{" "}
          <span className="text-bone">{order.customer_name}</span>. Your
          ritual has been sealed.
        </p>

        <div className="bg-surface text-left p-8 mb-10">
          <div className="font-sans text-micro uppercase tracking-widest text-taupe mb-6 pb-4 border-b border-taupe/20 flex justify-between">
            <span>Order ID</span>
            <span className="text-bone">
              {order.id.slice(0, 8).toUpperCase()}
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

          <div className="border-t border-taupe/20 pt-4 flex justify-between items-center">
            <span className="font-sans text-body text-bone">Total Paid</span>
            <span className="font-sans text-body-lg text-bone">
              ₹{order.total}
            </span>
          </div>
        </div>

        <p className="font-sans text-caption text-taupe mb-12">
          A confirmation email has been sent to{" "}
          <span className="text-bone">{order.customer_email}</span> with your
          receipt and tracking details.
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
