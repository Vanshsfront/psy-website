"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Eye, Search, ShoppingBag, Truck } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Refunded", value: "refunded" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return "bg-neon-green/20 text-neon-green border border-neon-green/50";
    case "shipped":
      return "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50";
    case "delivered":
      return "bg-mutedText text-black border border-mutedText";
    case "pending":
      return "bg-warning/20 text-warning border border-warning/50";
    case "refunded":
      return "bg-danger/20 text-danger border border-danger/50";
    default:
      return "bg-borderDark text-white";
  }
}

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { orders, isLoading } = useOrders();

  // Client-side filtering for responsiveness
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          (o.order_number?.toLowerCase().includes(q) ?? false)
      );
    }

    if (status) {
      result = result.filter((o) => o.status === status);
    }

    return result;
  }, [orders, search, status]);

  // Revenue calc
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "paid" || o.status === "delivered" || o.status === "shipped")
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">Orders</h1>
          <p className="text-taupe text-caption mt-1">
            {orders.length} order{orders.length !== 1 ? "s" : ""} · ₹
            {totalRevenue.toLocaleString()} revenue
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 bg-ink z-10 py-3 mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, order #..."
            className="w-full border-0 border-b border-[#2a2a2a] bg-transparent pl-6 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 border border-[#2a2a2a] bg-ink px-3 text-sm text-bone focus:ring-1 focus:ring-psy-green outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="ml-auto text-taupe text-caption">
          Showing {filteredOrders.length} of {orders.length}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="divide-y divide-borderDark">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-surfaceLighter/30" />
            ))}
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <ShoppingBag className="w-10 h-10 mx-auto mb-4 text-taupe/40" />
          <p className="text-lg mb-2">No orders found</p>
          <p className="text-sm">
            {search || status
              ? "Try adjusting your filters"
              : "Orders will appear here when customers make purchases"}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surfaceLighter border-b border-borderDark text-xs uppercase tracking-wider text-mutedText font-mono">
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark text-sm">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-surfaceLighter/50 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-mono text-neon-cyan text-xs font-bold">
                        {order.order_number || order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </td>
                    <td className="p-4 text-mutedText text-xs">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-primaryText">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-mutedText">
                        {order.customer_email}
                      </p>
                    </td>
                    <td className="p-4 text-xs text-mutedText">
                      {Array.isArray(order.items) ? order.items.length : "—"} item{Array.isArray(order.items) && order.items.length !== 1 ? "s" : ""}
                    </td>
                    <td className="p-4 font-mono font-bold">₹{Number(order.total).toLocaleString("en-IN")}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                        {order.tracking_number && (
                          <span title={`Tracking: ${order.tracking_number}`}>
                            <Truck className="w-3 h-3 text-neon-cyan" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-neon-cyan"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
