"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import DataTable, { DataTableColumn } from "@/components/storeadmin/DataTable";
import OrderEditDrawer from "@/components/storeadmin/OrderEditDrawer";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatDate, getPaymentColor } from "@/lib/storeadmin/utils";
import type { Order } from "@/types/storeadmin";
import { Loader2, PlusCircle } from "lucide-react";

const APPOINTMENT_TYPES = ["Tattoo", "Piercing", "Free Consultation"] as const;
function parseAppointmentType(desc: string | null | undefined): string {
    if (!desc) return "";
    const idx = desc.indexOf(" - ");
    const head = (idx >= 0 ? desc.slice(0, idx) : desc).trim();
    return (APPOINTMENT_TYPES as readonly string[]).includes(head) ? head : "";
}

function OrdersContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const orderRes = await api.getOrders();
            setOrders(orderRes.orders);
        } catch (e) {
            console.error("Failed to load orders:", e);
        } finally {
            setLoading(false);
        }
    };

    const columns = useMemo<DataTableColumn<Order>[]>(
        () => [
            {
                key: "order_date",
                label: "Date",
                type: "date",
                accessor: (o) => o.order_date,
                render: (o) => formatDate(o.order_date),
                width: "130px",
            },
            {
                key: "order_number",
                label: "Order #",
                type: "text",
                accessor: (o) => o.order_number ?? "",
                render: (o) =>
                    o.order_number ? (
                        <span className="font-mono text-xs text-[var(--muted)]">
                            {o.order_number}
                        </span>
                    ) : (
                        <span className="text-[var(--muted)]">—</span>
                    ),
                width: "120px",
            },
            {
                key: "customer_name",
                label: "Customer",
                type: "text",
                accessor: (o) => o.customers?.name ?? "",
                render: (o) =>
                    o.customers?.name ? (
                        <span
                            className="text-sm font-medium hover:text-[var(--primary)] transition-colors"
                            onClick={(e) => {
                                if (o.customer_id) {
                                    e.stopPropagation();
                                    router.push(`/storeadmin/customers/${o.customer_id}`);
                                }
                            }}
                        >
                            {o.customers.name}
                        </span>
                    ) : (
                        <span className="text-[var(--muted)]">Unknown</span>
                    ),
            },
            {
                key: "service_description",
                label: "Service",
                type: "text",
                accessor: (o) => o.service_description ?? "",
                render: (o) => (
                    <span className="text-[var(--muted)] max-w-[220px] truncate inline-block align-middle">
                        {o.service_description || "—"}
                    </span>
                ),
            },
            {
                key: "appointment_type",
                label: "Type",
                type: "enum",
                accessor: (o) => parseAppointmentType(o.service_description),
                render: (o) => {
                    const t = parseAppointmentType(o.service_description);
                    return t ? (
                        <span className="text-sm">{t}</span>
                    ) : (
                        <span className="text-[var(--muted)]">—</span>
                    );
                },
                width: "140px",
            },
            {
                key: "artist_name",
                label: "Artist",
                type: "enum",
                accessor: (o) => o.artists?.name ?? "",
                render: (o) => o.artists?.name || <span className="text-[var(--muted)]">—</span>,
                width: "140px",
            },
            {
                key: "payment_mode",
                label: "Payment",
                type: "enum",
                accessor: (o) => (o.payment_mode ? o.payment_mode.toLowerCase() : ""),
                render: (o) => (
                    <span className={getPaymentColor(o.payment_mode)}>
                        {o.payment_mode || "—"}
                    </span>
                ),
                width: "100px",
            },
            {
                key: "deposit",
                label: "Deposit",
                type: "number",
                accessor: (o) => o.deposit,
                render: (o) => (
                    <span className="text-[var(--muted)]">{formatCurrency(o.deposit)}</span>
                ),
                align: "right",
                width: "110px",
            },
            {
                key: "total",
                label: "Total",
                type: "number",
                accessor: (o) => o.total,
                render: (o) => (
                    <span className="font-semibold text-[var(--primary)]">
                        {formatCurrency(o.total)}
                    </span>
                ),
                align: "right",
                width: "110px",
            },
            {
                key: "source",
                label: "Source",
                type: "enum",
                accessor: (o) => o.source ?? "",
                width: "110px",
            },
            {
                key: "tracking_number",
                label: "Tracking",
                type: "text",
                accessor: (o) => o.tracking_number ?? "",
                width: "140px",
            },
        ],
        [router]
    );

    const handleSaved = (updated: Order | null) => {
        if (!editingId) return;
        if (!updated) {
            setOrders((prev) => prev.filter((o) => o.id !== editingId));
        } else {
            setOrders((prev) => prev.map((o) => (o.id === editingId ? { ...o, ...updated } : o)));
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Orders</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">
                            {orders.length} orders
                        </p>
                    </div>
                    <Link
                        href="/storeadmin/orders/new"
                        className="neo-btn neo-btn-primary px-5 py-2.5 text-sm flex items-center gap-2 cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New Order
                    </Link>
                </div>

                <DataTable<Order>
                    rows={orders}
                    columns={columns}
                    rowKey={(o) => o.id}
                    onRowClick={(o) => setEditingId(o.id)}
                    storageKey="psy_orders_table_v3"
                    defaultHiddenColumns={["order_number", "tracking_number"]}
                    loading={loading}
                    globalSearch={{
                        placeholder: "Search customer, service, tracking, order #…",
                        accessor: (o) =>
                            [
                                o.customers?.name,
                                o.service_description,
                                o.tracking_number,
                                o.order_number,
                                o.artists?.name,
                            ]
                                .filter(Boolean)
                                .join(" "),
                    }}
                    summary={(rows) => {
                        const total = rows.reduce((s, r) => s + (r.total || 0), 0);
                        return `${rows.length} shown · ${formatCurrency(total)} total`;
                    }}
                />

                <OrderEditDrawer
                    open={editingId !== null}
                    orderId={editingId}
                    onClose={() => setEditingId(null)}
                    onSaved={handleSaved}
                />
            </main>
        </div>
    );
}

export default function OrdersPage() {
    return <OrdersContent />;
}
