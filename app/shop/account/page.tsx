"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerStore } from "@/store/customerStore";
import { Package, Calendar, ArrowRight } from "lucide-react";

interface OrderSummary {
  id: string;
  order_number: string | null;
  created_at: string;
  total: number;
  status: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  paid: "bg-green-500/20 text-green-400 border-green-500/50",
  shipped: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  delivered: "bg-psy-green/20 text-psy-green border-psy-green/50",
  refunded: "bg-taupe/20 text-taupe border-taupe/50",
};

export default function AccountOverviewPage() {
  const router = useRouter();
  const { token, customer, isLoggedIn } = useCustomerStore();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
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

  if (!customer) return null;

  const memberSince = new Date(customer.created_at).toLocaleDateString(
    "en-IN",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const recentOrders = orders.slice(0, 3);

  return (
    <div className="animate-fade-in-up">
      {/* Greeting */}
      <h1 className="font-display text-display-lg text-bone mb-2">
        Hello, {customer.name}
      </h1>
      <p className="font-sans text-body text-taupe mb-10">
        Welcome back to your account.
      </p>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <div className="bg-surface p-6 border border-taupe/10">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-5 h-5 text-psy-green" />
            <span className="font-sans text-micro uppercase tracking-widest text-taupe">
              Total Orders
            </span>
          </div>
          <p className="font-display text-display-lg text-bone">
            {loading ? "..." : orders.length}
          </p>
        </div>
        <div className="bg-surface p-6 border border-taupe/10">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-psy-green" />
            <span className="font-sans text-micro uppercase tracking-widest text-taupe">
              Member Since
            </span>
          </div>
          <p className="font-display text-body-lg text-bone">{memberSince}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-body-lg text-bone">Recent Orders</h2>
        {orders.length > 3 && (
          <Link
            href="/shop/account/orders"
            className="flex items-center gap-1 font-sans text-micro uppercase tracking-widest text-psy-green hover:text-bone transition-colors duration-300"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="bg-surface border border-taupe/10 p-8 text-center">
          <p className="font-sans text-caption text-taupe">
            Loading orders...
          </p>
        </div>
      ) : recentOrders.length === 0 ? (
        <div className="bg-surface border border-taupe/10 p-8 text-center">
          <p className="font-sans text-body text-taupe mb-4">
            No orders yet.
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
          {recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/shop/account/orders/${order.id}`}
              className="block bg-surface border border-taupe/10 p-5 hover:border-taupe/30 transition-colors duration-300 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span className="font-sans text-caption text-bone">
                    #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                      statusColors[order.status] ||
                      "bg-taupe/20 text-taupe border-taupe/50"
                    }`}
                  >
                    {order.status}
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
          ))}
        </div>
      )}
    </div>
  );
}
