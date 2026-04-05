"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCustomerStore } from "@/store/customerStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, Check, CreditCard, Package, RotateCcw } from "lucide-react";

interface OrderItem {
  product_id?: string;
  name: string;
  quantity: number;
  price: number;
  image_url?: string;
  variant?: Record<string, unknown> | null;
}

interface Order {
  id: string;
  order_number: string | null;
  created_at: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  discount_code: string | null;
  shipping: number;
  total: number;
  shipping_address: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  tracking_number: string | null;
  courier_name: string | null;
  customer_name: string;
  customer_email: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  paid: "bg-green-500/20 text-green-400 border-green-500/50",
  shipped: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  delivered: "bg-psy-green/20 text-psy-green border-psy-green/50",
  refunded: "bg-taupe/20 text-taupe border-taupe/50",
};

const timelineSteps = [
  { key: "pending", label: "Placed", icon: Package },
  { key: "paid", label: "Paid", icon: CreditCard },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Check },
];

function getStepIndex(status: string) {
  const idx = timelineSteps.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isLoggedIn } = useCustomerStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/shop/account/login");
      return;
    }
    fetchOrder();
  }, [isLoggedIn, router, params.id]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/shop/orders/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        router.push("/shop/account/orders");
      }
    } catch {
      router.push("/shop/account/orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnSubmit() {
    if (!order || !returnReason.trim()) return;
    setReturnSubmitting(true);
    try {
      const res = await fetch("/api/shop/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: order.id,
          reason: returnReason,
          items: order.items.map((item) => ({
            product_id: item.product_id || "",
            name: item.name,
            quantity: item.quantity,
          })),
        }),
      });
      if (res.ok) {
        setReturnSuccess(true);
        setShowReturnForm(false);
        setReturnReason("");
      }
    } catch {
      // silently fail
    } finally {
      setReturnSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="bg-surface border border-taupe/10 p-8 animate-pulse">
          <div className="h-6 w-48 bg-taupe/10 rounded mb-4" />
          <div className="h-4 w-32 bg-taupe/10 rounded" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentStep = getStepIndex(order.status);
  const isReturnable = ["paid", "shipped", "delivered"].includes(order.status);

  return (
    <div className="animate-fade-in-up">
      {/* Back link */}
      <Link
        href="/shop/account/orders"
        className="inline-flex items-center gap-2 font-sans text-micro uppercase tracking-widest text-taupe hover:text-bone transition-colors duration-300 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-display-lg text-bone">
            Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="font-sans text-caption text-taupe mt-1">
            Placed on{" "}
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          className={`inline-flex self-start px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded border ${
            statusColors[order.status] ||
            "bg-taupe/20 text-taupe border-taupe/50"
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Progress Timeline */}
      {order.status !== "refunded" && (
        <div className="bg-surface border border-taupe/10 p-6 mb-6">
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-4 left-0 right-0 h-[1px] bg-taupe/20" />
            <div
              className="absolute top-4 left-0 h-[1px] bg-psy-green transition-all duration-500"
              style={{
                width: `${(currentStep / (timelineSteps.length - 1)) * 100}%`,
              }}
            />
            {timelineSteps.map((step, idx) => {
              const isCompleted = idx <= currentStep;
              const Icon = step.icon;
              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center relative z-10"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors duration-300 ${
                      isCompleted
                        ? "bg-psy-green/20 border border-psy-green text-psy-green"
                        : "bg-surface border border-taupe/30 text-taupe/40"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`font-sans text-[10px] uppercase tracking-widest ${
                      isCompleted ? "text-bone" : "text-taupe/40"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-surface border border-taupe/10 p-6 mb-6">
        <h2 className="font-sans text-micro uppercase tracking-widest text-taupe mb-5">
          Items
        </h2>
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 pb-4 border-b border-taupe/10 last:border-0 last:pb-0"
            >
              {item.image_url ? (
                <div className="w-14 h-14 bg-ink flex-shrink-0 relative overflow-hidden">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 bg-ink flex-shrink-0 flex items-center justify-center">
                  <Package className="w-5 h-5 text-taupe/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-sans text-caption text-bone truncate">
                  {item.name}
                </p>
                <p className="font-sans text-micro text-taupe">
                  Qty: {item.quantity}
                </p>
              </div>
              <p className="font-sans text-caption text-bone flex-shrink-0">
                ₹{item.price * item.quantity}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-surface border border-taupe/10 p-6 mb-6">
        <h2 className="font-sans text-micro uppercase tracking-widest text-taupe mb-5">
          Order Summary
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between font-sans text-caption text-taupe">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between font-sans text-caption text-psy-green">
              <span>
                Discount
                {order.discount_code ? ` (${order.discount_code})` : ""}
              </span>
              <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-sans text-caption text-taupe">
            <span>Shipping</span>
            <span>
              {Number(order.shipping) === 0
                ? "FREE"
                : `₹${order.shipping}`}
            </span>
          </div>
          <div className="flex justify-between font-sans text-body text-bone pt-3 mt-3 border-t border-taupe/20">
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="bg-surface border border-taupe/10 p-6 mb-6">
          <h2 className="font-sans text-micro uppercase tracking-widest text-taupe mb-4">
            Shipping Address
          </h2>
          <p className="font-sans text-caption text-bone leading-relaxed">
            {order.customer_name}
            <br />
            {order.shipping_address.address}
            <br />
            {order.shipping_address.city}, {order.shipping_address.state}{" "}
            {order.shipping_address.pincode}
          </p>
        </div>
      )}

      {/* Tracking Info */}
      {order.tracking_number && (
        <div className="bg-surface border border-taupe/10 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-psy-green" />
            <h2 className="font-sans text-micro uppercase tracking-widest text-psy-green">
              Tracking Information
            </h2>
          </div>
          <p className="font-sans text-caption text-bone">
            {order.courier_name && (
              <span className="text-taupe">{order.courier_name}: </span>
            )}
            {order.tracking_number}
          </p>
        </div>
      )}

      {/* Return Request */}
      {isReturnable && !returnSuccess && (
        <div className="bg-surface border border-taupe/10 p-6">
          {showReturnForm ? (
            <div>
              <h2 className="font-sans text-micro uppercase tracking-widest text-taupe mb-4">
                Request a Return
              </h2>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Please tell us why you'd like to return this order..."
                rows={4}
                className="w-full bg-transparent border border-taupe/20 text-bone font-sans text-caption p-4 placeholder:text-taupe/40 focus:border-psy-green focus:outline-none transition-colors duration-300 resize-none mb-4"
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleReturnSubmit}
                  disabled={!returnReason.trim() || returnSubmitting}
                >
                  {returnSubmitting ? "Submitting..." : "Submit Return Request"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowReturnForm(false);
                    setReturnReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReturnForm(true)}
              className="flex items-center gap-2 font-sans text-micro uppercase tracking-widest text-taupe hover:text-bone transition-colors duration-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Request Return
            </button>
          )}
        </div>
      )}

      {returnSuccess && (
        <div className="bg-psy-green/10 border border-psy-green/30 p-6">
          <p className="font-sans text-caption text-psy-green">
            Your return request has been submitted. We will review it and get
            back to you shortly.
          </p>
        </div>
      )}
    </div>
  );
}
