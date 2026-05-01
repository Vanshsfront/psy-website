"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import DataTable, { DataTableColumn } from "@/components/storeadmin/DataTable";
import InlineCell from "@/components/storeadmin/InlineCell";
import OrderEditDrawer from "@/components/storeadmin/OrderEditDrawer";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency, formatDate, getPaymentColor } from "@/lib/storeadmin/utils";
import type { Order, Artist } from "@/types/storeadmin";
import { Loader2, PlusCircle, Pencil, CheckCircle2, Circle } from "lucide-react";

const APPOINTMENT_TYPES = ["Tattoo", "Piercing", "Free Consultation"] as const;
function parseAppointmentType(desc: string | null | undefined): string {
    if (!desc) return "";
    const idx = desc.indexOf(" - ");
    const head = (idx >= 0 ? desc.slice(0, idx) : desc).trim();
    return (APPOINTMENT_TYPES as readonly string[]).includes(head) ? head : "";
}

function buildServiceDescription(appointmentType: string, rest: string | null | undefined): string | null {
    const trimmed = (rest || "").trim();
    if (!appointmentType && !trimmed) return null;
    return [appointmentType, trimmed].filter(Boolean).join(" - ") || null;
}

function getServiceTail(desc: string | null | undefined): string {
    if (!desc) return "";
    const idx = desc.indexOf(" - ");
    if (idx < 0) {
        const head = desc.trim();
        return (APPOINTMENT_TYPES as readonly string[]).includes(head) ? "" : head;
    }
    return desc.slice(idx + 3).trim();
}

const PAYMENT_OPTIONS = [
    { value: "", label: "—" },
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "other", label: "Other" },
];

const SOURCE_OPTIONS = [
    { value: "", label: "—" },
    { value: "instagram", label: "Instagram" },
    { value: "walk-in", label: "Walk-in" },
    { value: "referral", label: "Referral" },
    { value: "google", label: "Google" },
];

function OrdersContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
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
            const [orderRes, artistRes] = await Promise.all([
                api.getOrders(),
                api.getArtists(true),
            ]);
            setOrders(orderRes.orders);
            setArtists(artistRes.artists);
        } catch (e) {
            console.error("Failed to load orders:", e);
        } finally {
            setLoading(false);
        }
    };

    const artistOptions = useMemo(
        () => [
            { value: "", label: "Unassigned" },
            ...artists
                .filter((a) => a.is_active)
                .map((a) => ({ value: a.id, label: a.name })),
        ],
        [artists]
    );

    const saveField = async (orderId: string, patch: Record<string, unknown>) => {
        const res = await api.updateOrder(orderId, patch);
        clearApiCache();
        // Merge in nested artist name if artist changed
        let nextArtist: { name: string } | undefined;
        if ("artist_id" in patch) {
            const a = artists.find((x) => x.id === patch.artist_id);
            nextArtist = a ? { name: a.name } : undefined;
        }
        setOrders((prev) =>
            prev.map((o) =>
                o.id === orderId
                    ? {
                          ...o,
                          ...res.order,
                          artists: nextArtist ?? o.artists,
                      }
                    : o
            )
        );
    };

    const columns = useMemo<DataTableColumn<Order>[]>(
        () => [
            {
                key: "order_date",
                label: "Date",
                type: "date",
                accessor: (o) => o.order_date,
                render: (o) => (
                    <InlineCell
                        type="date"
                        value={o.order_date ? o.order_date.split("T")[0] : ""}
                        display={<span>{formatDate(o.order_date)}</span>}
                        onSave={(next) =>
                            saveField(o.id, { order_date: next || null })
                        }
                    />
                ),
                width: "150px",
            },
            {
                key: "consent_signed",
                label: "Consent",
                type: "enum",
                accessor: (o) => (o.consent_signed ? "yes" : "no"),
                render: (o) => (
                    <InlineCell
                        type="checkbox"
                        value={!!o.consent_signed}
                        onSave={(next) =>
                            saveField(o.id, { consent_signed: !!next })
                        }
                        display={
                            o.consent_signed ? (
                                <span title="Consent signed" className="inline-flex items-center gap-1 text-[var(--primary)]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                            ) : (
                                <span title="Not signed" className="inline-flex items-center gap-1 text-[var(--muted)]">
                                    <Circle className="w-3.5 h-3.5" />
                                </span>
                            )
                        }
                    />
                ),
                width: "90px",
            },
            {
                key: "customer_name",
                label: "Customer",
                type: "text",
                accessor: (o) => o.customers?.name ?? "",
                render: (o) =>
                    o.customers?.name ? (
                        <button
                            type="button"
                            className="text-sm font-medium hover:text-[var(--primary)] transition-colors"
                            onClick={(e) => {
                                if (o.customer_id) {
                                    e.stopPropagation();
                                    router.push(`/storeadmin/customers/${o.customer_id}`);
                                }
                            }}
                        >
                            {o.customers.name}
                        </button>
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
                    <InlineCell
                        type="text"
                        value={getServiceTail(o.service_description)}
                        placeholder="What was done"
                        onSave={(next) => {
                            const head = parseAppointmentType(o.service_description);
                            return saveField(o.id, {
                                service_description: buildServiceDescription(
                                    head,
                                    typeof next === "string" ? next : ""
                                ),
                            });
                        }}
                        display={
                            <span className="text-[var(--muted)] max-w-[260px] truncate inline-block align-middle">
                                {o.service_description || "—"}
                            </span>
                        }
                    />
                ),
            },
            {
                key: "appointment_type",
                label: "Type",
                type: "enum",
                accessor: (o) => parseAppointmentType(o.service_description),
                render: (o) => (
                    <InlineCell
                        type="select"
                        value={parseAppointmentType(o.service_description)}
                        options={[
                            { value: "", label: "—" },
                            ...APPOINTMENT_TYPES.map((t) => ({ value: t, label: t })),
                        ]}
                        onSave={(next) => {
                            const tail = getServiceTail(o.service_description);
                            return saveField(o.id, {
                                service_description: buildServiceDescription(
                                    typeof next === "string" ? next : "",
                                    tail
                                ),
                            });
                        }}
                    />
                ),
                width: "150px",
            },
            {
                key: "artist_name",
                label: "Artist",
                type: "enum",
                accessor: (o) => o.artists?.name ?? "",
                render: (o) => (
                    <InlineCell
                        type="select"
                        value={o.artist_id ?? ""}
                        options={artistOptions}
                        onSave={(next) =>
                            saveField(o.id, { artist_id: next || null })
                        }
                        display={
                            o.artists?.name || <span className="text-[var(--muted)]">—</span>
                        }
                    />
                ),
                width: "160px",
            },
            {
                key: "payment_mode",
                label: "Payment",
                type: "enum",
                accessor: (o) => (o.payment_mode ? o.payment_mode.toLowerCase() : ""),
                render: (o) => (
                    <InlineCell
                        type="select"
                        value={o.payment_mode ?? ""}
                        options={PAYMENT_OPTIONS}
                        onSave={(next) =>
                            saveField(o.id, { payment_mode: next || null })
                        }
                        display={
                            <span className={getPaymentColor(o.payment_mode)}>
                                {o.payment_mode || "—"}
                            </span>
                        }
                    />
                ),
                width: "120px",
            },
            {
                key: "deposit",
                label: "Deposit",
                type: "number",
                accessor: (o) => o.deposit,
                render: (o) => (
                    <InlineCell
                        type="number"
                        value={o.deposit ?? 0}
                        onSave={(next) =>
                            saveField(o.id, { deposit: Number(next) || 0 })
                        }
                        display={
                            <span className="text-[var(--muted)]">{formatCurrency(o.deposit)}</span>
                        }
                    />
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
                    <InlineCell
                        type="number"
                        value={o.total ?? 0}
                        onSave={(next) =>
                            saveField(o.id, { total: Number(next) || 0 })
                        }
                        display={
                            <span className="font-semibold text-[var(--primary)]">
                                {formatCurrency(o.total)}
                            </span>
                        }
                    />
                ),
                align: "right",
                width: "110px",
            },
            {
                key: "source",
                label: "Source",
                type: "enum",
                accessor: (o) => o.source ?? "",
                render: (o) => (
                    <InlineCell
                        type="select"
                        value={o.source ?? ""}
                        options={SOURCE_OPTIONS}
                        onSave={(next) =>
                            saveField(o.id, { source: next || null })
                        }
                    />
                ),
                width: "120px",
            },
            {
                key: "tracking_number",
                label: "Tracking",
                type: "text",
                accessor: (o) => o.tracking_number ?? "",
                render: (o) => (
                    <InlineCell
                        type="text"
                        value={o.tracking_number ?? ""}
                        onSave={(next) =>
                            saveField(o.id, { tracking_number: next || null })
                        }
                    />
                ),
                width: "150px",
            },
            {
                key: "details",
                label: "",
                type: "text",
                accessor: () => "",
                sortable: false,
                filterable: false,
                width: "60px",
                align: "right",
                render: (o) => (
                    <button
                        type="button"
                        title="Open full edit drawer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(o.id);
                        }}
                        className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [router, artistOptions]
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Orders</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">
                            {orders.length} orders · click any cell to edit, pencil for full drawer
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
                    storageKey="psy_orders_table_v4"
                    defaultHiddenColumns={["tracking_number"]}
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
