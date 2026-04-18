"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import DataTable, { DataTableColumn } from "@/components/storeadmin/DataTable";
import CustomerEditDrawer from "@/components/storeadmin/CustomerEditDrawer";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatRelativeDate, getSourceColor } from "@/lib/storeadmin/utils";
import type { Customer } from "@/types/storeadmin";
import { Loader2 } from "lucide-react";

function CustomersContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
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
            const res = await api.getCustomers();
            setCustomers(res.customers);
        } catch (e) {
            console.error("Failed to load customers:", e);
        } finally {
            setLoading(false);
        }
    };

    const columns = useMemo<DataTableColumn<Customer>[]>(
        () => [
            {
                key: "name",
                label: "Customer",
                type: "text",
                accessor: (c) => c.name,
                render: (c) => (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            <p className="text-xs text-[var(--muted)]">
                                {c.visit_count || 0} visit{(c.visit_count || 0) !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                key: "phone",
                label: "Phone",
                type: "text",
                accessor: (c) => c.phone ?? "",
                width: "150px",
            },
            {
                key: "instagram",
                label: "Instagram",
                type: "text",
                accessor: (c) => c.instagram ?? "",
                render: (c) =>
                    c.instagram ? (
                        <span className="text-[var(--primary)]">@{c.instagram}</span>
                    ) : (
                        <span className="text-[var(--muted)]">—</span>
                    ),
                width: "150px",
            },
            {
                key: "email",
                label: "Email",
                type: "text",
                accessor: (c) => c.email ?? "",
                width: "180px",
            },
            {
                key: "source",
                label: "Source",
                type: "enum",
                accessor: (c) => c.source ?? "",
                render: (c) =>
                    c.source ? (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getSourceColor(c.source)}`}>
                            {c.source}
                        </span>
                    ) : (
                        <span className="text-[var(--muted)]">—</span>
                    ),
                width: "120px",
            },
            {
                key: "visit_count",
                label: "Visits",
                type: "number",
                accessor: (c) => c.visit_count ?? 0,
                align: "right",
                width: "90px",
            },
            {
                key: "lifetime_spend",
                label: "Lifetime",
                type: "number",
                accessor: (c) => c.lifetime_spend ?? 0,
                render: (c) => (
                    <span className="font-semibold text-[var(--primary)]">
                        {formatCurrency(c.lifetime_spend || 0)}
                    </span>
                ),
                align: "right",
                width: "130px",
            },
            {
                key: "last_visit_date",
                label: "Last visit",
                type: "date",
                accessor: (c) => c.last_visit_date ?? "",
                render: (c) => (
                    <span className="text-[var(--muted)]">
                        {formatRelativeDate(c.last_visit_date)}
                    </span>
                ),
                width: "130px",
            },
            {
                key: "last_artist_name",
                label: "Last artist",
                type: "enum",
                accessor: (c) => c.last_artist_name ?? "",
                width: "140px",
            },
            {
                key: "last_payment_mode",
                label: "Last payment",
                type: "enum",
                accessor: (c) => c.last_payment_mode ?? "",
                render: (c) =>
                    c.last_payment_mode ? (
                        <span className="text-sm">{c.last_payment_mode}</span>
                    ) : (
                        <span className="text-[var(--muted)]">—</span>
                    ),
                width: "130px",
            },
            {
                key: "payment_modes_used",
                label: "Payment modes",
                type: "multi-enum",
                sortable: false,
                accessor: (c) => c.payment_modes_used ?? [],
                render: (c) => {
                    const modes = c.payment_modes_used ?? [];
                    if (modes.length === 0) {
                        return <span className="text-[var(--muted)]">—</span>;
                    }
                    return (
                        <div className="flex flex-wrap gap-1">
                            {modes.map((m) => (
                                <span
                                    key={m}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--muted)]"
                                >
                                    {m}
                                </span>
                            ))}
                        </div>
                    );
                },
            },
        ],
        []
    );

    const handleSaved = (updated: Customer | null) => {
        if (!editingId) return;
        if (!updated) {
            setCustomers((prev) => prev.filter((c) => c.id !== editingId));
        } else {
            setCustomers((prev) =>
                prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c))
            );
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const totalRevenue = customers.reduce((s, c) => s + (c.lifetime_spend || 0), 0);
    const avgSpend = customers.length > 0 ? totalRevenue / customers.length : 0;

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Customers</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">
                            {customers.length} customers · {formatCurrency(totalRevenue)} lifetime ·{" "}
                            {formatCurrency(avgSpend)} avg
                        </p>
                    </div>
                </div>

                <DataTable<Customer>
                    rows={customers}
                    columns={columns}
                    rowKey={(c) => c.id}
                    onRowClick={(c) => setEditingId(c.id)}
                    storageKey="psy_customers_table_v2"
                    loading={loading}
                    globalSearch={{
                        placeholder: "Search name, phone, Instagram, email, notes…",
                        accessor: (c) =>
                            [c.name, c.phone, c.instagram, c.email, c.notes]
                                .filter(Boolean)
                                .join(" "),
                    }}
                    summary={(rows) => {
                        const total = rows.reduce((s, r) => s + (r.lifetime_spend || 0), 0);
                        return `${rows.length} shown · ${formatCurrency(total)} lifetime`;
                    }}
                />

                <CustomerEditDrawer
                    open={editingId !== null}
                    customerId={editingId}
                    onClose={() => setEditingId(null)}
                    onSaved={handleSaved}
                />
            </main>
        </div>
    );
}

export default function CustomersPage() {
    return <CustomersContent />;
}
