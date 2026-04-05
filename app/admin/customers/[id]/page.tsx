import { createServiceClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import Link from "next/link"

export const revalidate = 0

export default async function AdminCustomerDetail({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServiceClient()

  const { data: customer, error } = await supabase
    .from("shop_customers")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !customer) {
    notFound()
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false })

  const totalOrders = orders?.length || 0
  const totalSpent =
    orders
      ?.filter(
        (o) =>
          o.status === "paid" || o.status === "delivered" || o.status === "shipped"
      )
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/admin/customers"
          className="text-mutedText hover:text-white transition-colors"
        >
          ← Back to Customers
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Customer Info */}
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-surface border border-borderDark p-6 rounded space-y-4">
            <div className="w-16 h-16 rounded-full bg-borderDark flex items-center justify-center text-2xl font-bold text-white uppercase">
              {customer.name?.[0] || "?"}
            </div>
            <div>
              <h1 className="text-3xl font-display font-light text-primaryText mb-1">
                {customer.name || "Unknown"}
              </h1>
              <p className="text-mutedText text-sm">{customer.email}</p>
            </div>

            <div className="pt-4 border-t border-borderDark space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-mutedText">Phone</span>
                <span className="text-primaryText">
                  {customer.phone || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedText">Member since</span>
                <span className="text-primaryText">
                  {new Date(customer.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-borderDark p-4 rounded text-center">
              <p className="text-2xl font-bold text-primaryText">
                {totalOrders}
              </p>
              <p className="text-xs text-mutedText uppercase tracking-widest mt-1">
                Orders
              </p>
            </div>
            <div className="bg-surface border border-borderDark p-4 rounded text-center">
              <p className="text-2xl font-bold text-neon-cyan font-mono">
                ₹{totalSpent.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-mutedText uppercase tracking-widest mt-1">
                Total Spent
              </p>
            </div>
          </div>
        </div>

        {/* Right: Order History */}
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold mb-4 text-primaryText">
            Order History
          </h2>

          {!orders || orders.length === 0 ? (
            <div className="bg-surface border border-borderDark rounded p-10 text-center text-mutedText text-sm">
              No orders from this customer yet.
            </div>
          ) : (
            <div className="bg-surface border border-borderDark rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surfaceLighter border-b border-borderDark text-mutedText text-xs uppercase tracking-widest font-mono">
                      <th className="p-4 font-medium">Order</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Total</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderDark text-sm">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-surfaceLighter/50 transition-colors"
                      >
                        <td className="p-4">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono text-neon-cyan text-xs font-bold hover:underline"
                          >
                            {order.order_number ||
                              order.id.slice(0, 8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="p-4 text-mutedText text-xs">
                          {new Date(order.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold">
                          ₹{Number(order.total).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                              order.status === "paid"
                                ? "bg-neon-green/20 text-neon-green border border-neon-green/50"
                                : order.status === "shipped"
                                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
                                  : order.status === "delivered"
                                    ? "bg-mutedText text-black border border-mutedText"
                                    : order.status === "pending"
                                      ? "bg-warning/20 text-warning border border-warning/50"
                                      : order.status === "refunded"
                                        ? "bg-danger/20 text-danger border border-danger/50"
                                        : "bg-borderDark text-white"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
