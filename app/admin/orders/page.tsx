import { createSSRClient } from "@/lib/supabase-server"
import Link from "next/link"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export const revalidate = 0

export default async function AdminOrdersPage() {
  const supabase = await createSSRClient()
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-borderDark">
        <h1 className="font-display text-3xl font-bold">Orders</h1>
      </div>

      <div className="bg-surface border border-borderDark rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surfaceLighter border-b border-borderDark text-xs uppercase tracking-wider text-mutedText font-mono">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderDark text-sm">
              {orders && orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surfaceLighter/50 transition-colors">
                    <td className="p-4 font-mono text-neon-cyan text-xs">{order.id.slice(0, 8)}</td>
                    <td className="p-4 text-mutedText">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-primaryText">{order.customer_name}</p>
                      <p className="text-xs text-mutedText">{order.customer_email}</p>
                    </td>
                    <td className="p-4 font-mono font-bold">₹{order.total}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                         order.status === 'paid' ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' :
                         order.status === 'shipped' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50' :
                         order.status === 'delivered' ? 'bg-mutedText text-black border border-mutedText' :
                         order.status === 'pending' ? 'bg-warning/20 text-warning border border-warning/50' :
                         'bg-borderDark text-white'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="icon" className="hover:text-neon-cyan">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-mutedText">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
