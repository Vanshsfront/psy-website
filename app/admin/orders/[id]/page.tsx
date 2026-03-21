import { createSSRClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { revalidatePath } from "next/cache"

export const revalidate = 0

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const supabase = await createSSRClient()
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !order) {
    notFound()
  }

  // Server Action to update status
  async function updateStatus(formData: FormData) {
    "use server"
    const newStatus = formData.get("status") as string
    const sbp = await createSSRClient()
    await sbp.from("orders").update({ status: newStatus }).eq("id", params.id)
    revalidatePath(`/admin/orders/${params.id}`)
    revalidatePath(`/admin/orders`)
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin/orders" className="text-mutedText hover:text-white transition-colors">
          ← Back to Orders
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Col - Details */}
        <div className="flex-1 space-y-8">
          
          <div className="bg-surface border border-borderDark p-6 rounded">
            <h2 className="font-display text-xl font-bold mb-6 flex justify-between">
              Order #{order.id.slice(0, 8)}
              <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                order.status === 'paid' ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' :
                order.status === 'shipped' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50' :
                order.status === 'delivered' ? 'bg-mutedText text-black border border-mutedText' :
                order.status === 'pending' ? 'bg-warning/20 border border-warning/50' :
                'bg-borderDark text-white'
              }`}>
                {order.status}
              </span>
            </h2>

            <div className="space-y-4">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-center bg-background border border-borderDark p-3 rounded">
                  <div className="w-16 h-16 bg-surfaceLighter rounded overflow-hidden">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <span className="font-bold text-sm text-primaryText">{item.name}</span>
                    <span className="text-xs font-mono text-mutedText">
                      Qty: {item.quantity} {item.variant ? `| Variant: ${Object.values(item.variant).join('-')}` : ''}
                    </span>
                  </div>
                  <span className="font-mono font-bold">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-borderDark space-y-2 font-mono text-sm max-w-[300px] ml-auto">
               <div className="flex justify-between text-mutedText"><span>Subtotal:</span> <span>₹{order.subtotal}</span></div>
               <div className="flex justify-between text-mutedText"><span>Shipping:</span> <span>₹{order.shipping}</span></div>
               <div className="flex justify-between font-bold text-neon-cyan text-base"><span>Total:</span> <span>₹{order.total}</span></div>
            </div>
          </div>

          <div className="bg-surface border border-borderDark p-6 rounded">
            <h2 className="font-display text-xl font-bold mb-6">Payment Info</h2>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div className="text-mutedText">Razorpay Order ID:</div>
              <div className="text-primaryText">{order.razorpay_order_id || 'N/A'}</div>
              <div className="text-mutedText">Razorpay Payment ID:</div>
              <div className="text-primaryText">{order.razorpay_payment_id || 'N/A'}</div>
              <div className="text-mutedText">Created At:</div>
              <div className="text-primaryText">{new Date(order.created_at).toLocaleString()}</div>
            </div>
          </div>

        </div>

        {/* Right Col - Customer & Actions */}
        <div className="w-full md:w-80 space-y-8">
          
          <div className="bg-surface border border-borderDark p-6 rounded space-y-6">
            <h2 className="font-display text-xl font-bold">Customer</h2>
            <div>
              <p className="font-bold text-primaryText">{order.customer_name}</p>
              <p className="text-sm text-mutedText">{order.customer_email}</p>
              <p className="text-sm text-mutedText">{order.customer_phone}</p>
            </div>
            <div className="pt-4 border-t border-borderDark">
              <h3 className="text-xs font-medium uppercase tracking-wider text-mutedText mb-2">Shipping Address</h3>
              <p className="text-sm text-primaryText leading-relaxed">
                {order.shipping_address.address}<br/>
                {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
              </p>
            </div>
          </div>

          <div className="bg-surface border border-borderDark p-6 rounded space-y-6">
            <h2 className="font-display text-xl font-bold">Update Status</h2>
            <form action={updateStatus} className="flex flex-col gap-4">
              <select name="status" defaultValue={order.status} className="h-10 rounded border border-borderDark bg-background px-3 text-sm focus-visible:ring-neon-cyan">
                <option value="pending">Pending</option>
                <option value="paid">Paid (Processing)</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="refunded">Refunded / Cancelled</option>
              </select>
              <Button type="submit" variant="neon" className="w-full">Save Changes</Button>
            </form>
          </div>

        </div>

      </div>
    </div>
  )
}
