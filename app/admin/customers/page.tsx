import { createServiceClient } from "@/lib/supabase-server"
import Link from "next/link"
import { Users } from "lucide-react"

export const revalidate = 0

export default async function AdminCustomersPage() {
  const supabase = createServiceClient()

  const { data: customers, error } = await supabase
    .from("shop_customers")
    .select("*")
    .order("created_at", { ascending: false })

  // Get order counts per customer
  const customerIds = customers?.map((c) => c.id) || []
  let orderCounts: Record<string, number> = {}

  if (customerIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_id")
      .in("customer_id", customerIds)

    if (orders) {
      for (const order of orders) {
        if (order.customer_id) {
          orderCounts[order.customer_id] =
            (orderCounts[order.customer_id] || 0) + 1
        }
      }
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-light text-primaryText mb-1">
          Customers
        </h1>
        <p className="text-mutedText text-sm">
          {customers?.length || 0} registered customer
          {customers?.length !== 1 ? "s" : ""}
        </p>
      </div>

      {!customers || customers.length === 0 ? (
        <div className="text-center py-20 text-mutedText">
          <Users className="w-10 h-10 mx-auto mb-4 text-mutedText/40" />
          <p className="text-lg mb-2">No customers yet</p>
          <p className="text-sm">
            Customers will appear here when they create accounts
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surfaceLighter border-b border-borderDark text-mutedText text-xs uppercase tracking-widest font-mono">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium">Joined</th>
                  <th className="p-4 font-medium text-center">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark text-sm">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-surfaceLighter/50 transition-colors"
                  >
                    <td className="p-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-medium text-primaryText hover:text-neon-cyan transition-colors"
                      >
                        {customer.name || "—"}
                      </Link>
                    </td>
                    <td className="p-4 text-mutedText">{customer.email}</td>
                    <td className="p-4 text-mutedText">
                      {customer.phone || "—"}
                    </td>
                    <td className="p-4 text-mutedText text-xs">
                      {new Date(customer.created_at).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block min-w-[28px] px-2 py-1 text-xs font-bold rounded bg-surfaceLighter text-primaryText">
                        {orderCounts[customer.id] || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
