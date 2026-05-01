"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import CustomerEditDrawer from "@/components/storeadmin/CustomerEditDrawer";
import OrderEditDrawer from "@/components/storeadmin/OrderEditDrawer";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatDate, formatRelativeDate, getSourceColor, getPaymentColor } from "@/lib/storeadmin/utils";
import type { Customer, Order, MessageLog } from "@/types/storeadmin";
import {
    ArrowLeft,
    Edit3,
    Phone,
    Instagram,
    Mail,
    Calendar,
    DollarSign,
    User,
    Loader2,
    TrendingUp,
    Hash,
    Palette,
    PlusCircle,
    MessageSquare,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import Link from "next/link";

function ProfileContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const customerId = params.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [messages, setMessages] = useState<MessageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [editCustomerOpen, setEditCustomerOpen] = useState(false);
    const [editOrderId, setEditOrderId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated && customerId) loadCustomer();
    }, [isAuthenticated, customerId]);

    const loadCustomer = async () => {
        setLoading(true);
        try {
            const [data, msgRes] = await Promise.all([
                api.getCustomer(customerId),
                api.getCustomerMessages(customerId).catch(() => ({ logs: [] as MessageLog[] })),
            ]);
            setCustomer(data);
            setOrders(data.orders || []);
            setMessages(msgRes.logs || []);
        } catch {
            console.error("Failed to load customer");
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerSaved = (updated: Customer | null) => {
        if (!updated) {
            router.push("/storeadmin/customers");
            return;
        }
        loadCustomer();
    };

    const handleOrderSaved = () => {
        loadCustomer();
    };

    if (authLoading || !isAuthenticated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
                Customer not found
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-6">
                    <button
                        onClick={() => router.push("/storeadmin/customers")}
                        className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Customers
                    </button>
                    <span>/</span>
                    <span className="text-[var(--foreground)]">{customer.name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Customer Info */}
                    <div className="lg:col-span-1 space-y-5">
                        <div className="glass-panel p-5 animate-fadeIn">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-lg font-bold text-white">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{customer.name}</h2>
                                        {customer.source && (
                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getSourceColor(customer.source)}`}>
                                                {customer.source}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditCustomerOpen(true)}
                                    className="p-2 rounded text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
                                    title="Edit"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3.5">
                                {[
                                    { icon: Phone, label: "Phone", value: customer.phone },
                                    {
                                        icon: Instagram,
                                        label: "Instagram",
                                        value: customer.instagram ? `@${customer.instagram}` : null,
                                    },
                                    { icon: Mail, label: "Email", value: customer.email },
                                    { icon: User, label: "Source", value: customer.source },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-start gap-3">
                                        <Icon className="w-4 h-4 text-[var(--muted)] mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
                                                {label}
                                            </p>
                                            <p className="text-sm">{value || "—"}</p>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex items-start gap-3">
                                    <Edit3 className="w-4 h-4 text-[var(--muted)] mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Notes</p>
                                        <p className="text-sm whitespace-pre-wrap">{customer.notes || "No notes"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
                            <h3 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                                Metrics
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { icon: DollarSign, label: "Lifetime Spend", value: formatCurrency(customer.lifetime_spend || 0), color: "text-[var(--primary)]" },
                                    { icon: Hash, label: "Total Visits", value: String(customer.visit_count || 0), color: "text-[var(--foreground)]" },
                                    { icon: Calendar, label: "Last Visit", value: formatRelativeDate(customer.last_visit_date), color: "text-[var(--foreground)]" },
                                    { icon: Palette, label: "Last Artist", value: customer.last_artist_name || "—", color: "text-[var(--foreground)]" },
                                ].map(({ icon: Icon, label, value, color }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-3.5 h-3.5 text-[var(--muted)]" />
                                            <span className="text-sm text-[var(--muted)]">{label}</span>
                                        </div>
                                        <span className={`text-sm font-semibold ${color}`}>{value}</span>
                                    </div>
                                ))}
                                {(customer.visit_count ?? 0) > 0 && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-3.5 h-3.5 text-[var(--muted)]" />
                                            <span className="text-sm text-[var(--muted)]">Avg per Visit</span>
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--muted)]">
                                            {formatCurrency((customer.lifetime_spend || 0) / (customer.visit_count || 1))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Order History */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="glass-panel overflow-hidden animate-fadeIn" style={{ animationDelay: "0.15s" }}>
                            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
                                <div>
                                    <h3 className="text-base font-semibold">Order History</h3>
                                    <p className="text-xs text-[var(--muted)]">
                                        {orders.length} orders · click a row to edit
                                    </p>
                                </div>
                                <Link
                                    href={`/storeadmin/orders/new?customer=${encodeURIComponent(customer.name)}&phone=${encodeURIComponent(customer.phone || "")}`}
                                    className="neo-btn neo-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    New Order
                                </Link>
                            </div>

                            {orders.length === 0 ? (
                                <div className="text-center py-12 text-[var(--muted)]">
                                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No orders yet</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table>
                                        <thead>
                                            <tr className="border-b border-[var(--border-color)]">
                                                <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Date</th>
                                                <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Service</th>
                                                <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Artist</th>
                                                <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Payment</th>
                                                <th className="text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Deposit</th>
                                                <th className="text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order) => (
                                                <tr
                                                    key={order.id}
                                                    tabIndex={0}
                                                    role="button"
                                                    onClick={() => setEditOrderId(order.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            setEditOrderId(order.id);
                                                        }
                                                    }}
                                                    className="border-b border-[var(--border-color-subtle)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                                                >
                                                    <td className="px-5 py-3 text-sm">{formatDate(order.order_date)}</td>
                                                    <td className="px-5 py-3 text-sm max-w-[200px] truncate">{order.service_description || "—"}</td>
                                                    <td className="px-5 py-3 text-sm">{order.artists?.name || "—"}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`text-sm ${getPaymentColor(order.payment_mode)}`}>
                                                            {order.payment_mode || "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-sm text-[var(--muted)]">{formatCurrency(order.deposit)}</td>
                                                    <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--primary)]">{formatCurrency(order.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* WhatsApp messages received */}
                        {messages.length > 0 && (
                            <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.18s" }}>
                                <h3 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <MessageSquare className="w-3 h-3" />
                                    WhatsApp Messages
                                    <span className="text-[var(--muted)] font-normal">({messages.length})</span>
                                </h3>
                                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                    {messages.map((m) => (
                                        <div
                                            key={m.id}
                                            className={`flex items-start gap-2 p-2.5 rounded text-sm ${
                                                m.status === "sent"
                                                    ? "bg-[var(--primary)]/5"
                                                    : "bg-[var(--danger)]/5"
                                            }`}
                                        >
                                            {m.status === "sent" ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)] mt-0.5 shrink-0" />
                                            ) : (
                                                <XCircle className="w-3.5 h-3.5 text-[var(--danger)] mt-0.5 shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{m.template_name}</p>
                                                <p className="text-xs text-[var(--muted)] mt-0.5">
                                                    {formatDate(m.sent_at)} · {m.status}
                                                </p>
                                                {m.error_message && (
                                                    <p className="text-[10px] text-[var(--danger)] mt-0.5">
                                                        {m.error_message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comments timeline */}
                        {orders.some(o => o.comments) && (
                            <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.2s" }}>
                                <h3 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                                    Comments
                                </h3>
                                <div className="space-y-3">
                                    {orders.filter(o => o.comments).map((order) => (
                                        <div key={order.id} className="flex gap-3">
                                            <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-2 shrink-0" />
                                            <div>
                                                <p className="text-sm">{order.comments}</p>
                                                <p className="text-xs text-[var(--muted)] mt-0.5">{formatDate(order.order_date)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <CustomerEditDrawer
                    open={editCustomerOpen}
                    customerId={customerId}
                    onClose={() => setEditCustomerOpen(false)}
                    onSaved={handleCustomerSaved}
                />

                <OrderEditDrawer
                    open={editOrderId !== null}
                    orderId={editOrderId}
                    onClose={() => setEditOrderId(null)}
                    onSaved={handleOrderSaved}
                />
            </main>
        </div>
    );
}

export default function CustomerProfilePage() {
    return <ProfileContent />;
}
