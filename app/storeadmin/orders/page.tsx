"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatDate, getPaymentColor } from "@/lib/storeadmin/utils";
import type { Order, Artist } from "@/types/storeadmin";
import {
    ClipboardList,
    Search,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    PlusCircle,
    Filter,
    X,
} from "lucide-react";
import Link from "next/link";

type SortKey = "order_date" | "total";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 25;

function OrdersContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [artistFilter, setArtistFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [totalMin, setTotalMin] = useState("");
    const [totalMax, setTotalMax] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>("order_date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [page, setPage] = useState(0);
    const [isRestored, setIsRestored] = useState(false);

    useEffect(() => {
        const saved = sessionStorage.getItem("psy_orders_state");
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (p.search) setSearch(p.search);
                if (p.artistFilter) setArtistFilter(p.artistFilter);
                if (p.paymentFilter) setPaymentFilter(p.paymentFilter);
                if (p.dateFrom) setDateFrom(p.dateFrom);
                if (p.dateTo) setDateTo(p.dateTo);
                if (p.totalMin) setTotalMin(p.totalMin);
                if (p.totalMax) setTotalMax(p.totalMax);
                if (p.showFilters) setShowFilters(p.showFilters);
            } catch { /* ignore */ }
        }
        setIsRestored(true);
    }, []);

    useEffect(() => {
        if (!isRestored) return;
        sessionStorage.setItem("psy_orders_state", JSON.stringify({ search, artistFilter, paymentFilter, dateFrom, dateTo, totalMin, totalMax, showFilters }));
    }, [isRestored, search, artistFilter, paymentFilter, dateFrom, dateTo, totalMin, totalMax, showFilters]);

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
                api.getArtists(),
            ]);
            setOrders(orderRes.orders);
            setArtists(artistRes.artists);
        } catch (e) {
            console.error("Failed to load orders:", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    let filtered = orders;
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(o =>
            (o.customers?.name || "").toLowerCase().includes(q) ||
            (o.service_description || "").toLowerCase().includes(q)
        );
    }
    if (artistFilter) filtered = filtered.filter(o => o.artist_id === artistFilter);
    if (paymentFilter) filtered = filtered.filter(o => o.payment_mode === paymentFilter);
    if (dateFrom) {
        const fromTs = new Date(dateFrom).getTime();
        filtered = filtered.filter(o => new Date(o.order_date).getTime() >= fromTs);
    }
    if (dateTo) {
        // Include the whole selected day
        const toTs = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
        filtered = filtered.filter(o => new Date(o.order_date).getTime() <= toTs);
    }
    if (totalMin) {
        const n = Number(totalMin);
        if (!Number.isNaN(n)) filtered = filtered.filter(o => (o.total || 0) >= n);
    }
    if (totalMax) {
        const n = Number(totalMax);
        if (!Number.isNaN(n)) filtered = filtered.filter(o => (o.total || 0) <= n);
    }

    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "order_date") cmp = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
        else cmp = (a.total || 0) - (b.total || 0);
        return sortDir === "asc" ? cmp : -cmp;
    });

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalAmount = filtered.reduce((s, o) => s + (o.total || 0), 0);

    const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
        <th
            className={`text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3 cursor-pointer hover:text-[var(--foreground)] transition-colors select-none ${className}`}
            onClick={() => toggleSort(field)}
        >
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-[var(--primary)]" : ""}`} />
            </div>
        </th>
    );

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Orders</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">
                            {filtered.length} orders &middot; {formatCurrency(totalAmount)} total
                        </p>
                    </div>
                    <Link href="/storeadmin/orders/new" className="neo-btn neo-btn-primary px-5 py-2.5 text-sm flex items-center gap-2 cursor-pointer">
                        <PlusCircle className="w-4 h-4" />
                        New Order
                    </Link>
                </div>

                {/* Search & Filters */}
                <div className="glass-panel p-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                placeholder="Search by customer or service..."
                                className="w-full pl-10 pr-4 py-2.5 neo-input text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 neo-btn text-sm cursor-pointer ${showFilters ? "border-[var(--primary)]/30 text-[var(--primary)]" : "text-[var(--muted)]"}`}
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex flex-wrap items-end gap-3 animate-fadeIn">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Artist</label>
                                <select
                                    value={artistFilter}
                                    onChange={(e) => { setArtistFilter(e.target.value); setPage(0); }}
                                    className="px-3 py-2 neo-input text-sm"
                                >
                                    <option value="">All Artists</option>
                                    {artists.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Payment</label>
                                <select
                                    value={paymentFilter}
                                    onChange={(e) => { setPaymentFilter(e.target.value); setPage(0); }}
                                    className="px-3 py-2 neo-input text-sm"
                                >
                                    <option value="">All Payments</option>
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="card">Card</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Date from</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                                    className="px-3 py-2 neo-input text-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Date to</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                                    className="px-3 py-2 neo-input text-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Min total</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={totalMin}
                                    onChange={(e) => { setTotalMin(e.target.value); setPage(0); }}
                                    placeholder="0"
                                    className="px-3 py-2 neo-input text-sm w-28"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Max total</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={totalMax}
                                    onChange={(e) => { setTotalMax(e.target.value); setPage(0); }}
                                    placeholder="∞"
                                    className="px-3 py-2 neo-input text-sm w-28"
                                />
                            </div>
                            <button
                                onClick={() => { setArtistFilter(""); setPaymentFilter(""); setSearch(""); setDateFrom(""); setDateTo(""); setTotalMin(""); setTotalMax(""); setPage(0); }}
                                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer transition-colors pb-2"
                            >
                                <X className="w-3 h-3" /> Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="glass-panel overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="text-center py-20 text-[var(--muted)]">
                            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No orders found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)]">
                                            <SortHeader label="Date" field="order_date" className="text-left" />
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Customer</th>
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Service</th>
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Artist</th>
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Payment</th>
                                            <th className="text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Deposit</th>
                                            <SortHeader label="Total" field="total" className="text-right" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((order, idx) => (
                                            <tr
                                                key={order.id}
                                                className="border-b border-[var(--border-color-subtle)] hover:bg-[var(--surface-hover)] transition-colors animate-fadeIn"
                                                style={{ animationDelay: `${idx * 0.02}s` }}
                                            >
                                                <td className="px-5 py-3 text-sm">{formatDate(order.order_date)}</td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className="text-sm font-medium hover:text-[var(--primary)] cursor-pointer transition-colors"
                                                        onClick={() => order.customer_id && router.push(`/storeadmin/customers/${order.customer_id}`)}
                                                    >
                                                        {order.customers?.name || "Unknown"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-[var(--muted)] max-w-[200px] truncate">{order.service_description || "—"}</td>
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

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)]">
                                    <p className="text-xs text-[var(--muted)]">
                                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function OrdersPage() {
    return <OrdersContent />;
}
