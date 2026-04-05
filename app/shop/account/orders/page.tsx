"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerStore } from "@/store/customerStore";
import { ArrowRight, Package } from "lucide-react";

interface Order {
  id: string;
  order_number: string | null;
  created_at: string;
  total: number;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  paid: "bg-green-500/20 text-green-400 border-green-500/50",
  shipped: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  delivered: "bg-psy-green/20 text-psy-green border-psy-green/50",
  refunded: "bg-taupe/20 text-taupe border-taupe/50",
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const { token, isLoggedIn } = useCustomerStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/shop/account/login");
      return;
    }
    fetchOrders();
  }, [isLoggedIn, router]);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/shop/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-display text-display-lg text-bone mb-8">
        Order History
      </h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-taupe/10 p-6 animate-pulse"
            >
              <div className="h-4 w-32 bg-taupe/10 rounded mb-3" />
              <div className="h-3 w-48 bg-taupe/10 rounded" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-surface border border-taupe/10 p-12 text-center">
          <Package className="w-10 h-10 text-taupe/40 mx-auto mb-4" />
          <p className="font-sans text-body text-taupe mb-4">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/shop"
            className="font-sans text-micro uppercase tracking-widest text-psy-green hover:text-bone transition-colors duration-300"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const itemCount = order.items?.reduce(
              (sum, i) => sum + i.quantity,
              0
            ) || 0;
            return (
              <Link
                key={order.id}
                href={`/shop/account/orders/${order.id}`}
                className="block bg-surface border border-taupe/10 p-5 hover:border-taupe/30 transition-colors duration-300 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-sans text-caption text-bone font-medium">
                      #
                      {order.order_number ||
                        order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                        statusColors[order.status] ||
                        "bg-taupe/20 text-taupe border-taupe/50"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="font-sans text-micro text-taupe">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-sans text-caption text-taupe">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-sans text-caption text-bone">
                      ₹{order.total}
                    </span>
                    <ArrowRight className="w-4 h-4 text-taupe group-hover:text-psy-green transition-colors duration-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
