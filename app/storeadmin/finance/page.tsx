"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import type { FinancialSummary, Order } from "@/types/storeadmin";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Loader2,
    Download,
    BarChart3,
    PieChart,
} from "lucide-react";
import Link from "next/link";

type DatePreset = "this_month" | "this_week" | "this_year" | "all_time";

function FinanceContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [activePreset, setActivePreset] = useState<DatePreset>("this_month");
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        applyPreset("this_month");
    }, []);

    useEffect(() => {
        if (isAuthenticated && dateFrom) loadData();
    }, [isAuthenticated, dateFrom, dateTo]);

    const applyPreset = (preset: DatePreset) => {
        setActivePreset(preset);
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        switch (preset) {
            case "this_week": {
                const start = new Date(now);
                start.setDate(now.getDate() - now.getDay());
                setDateFrom(start.toISOString().split("T")[0]);
                setDateTo(today);
                break;
            }
            case "this_month": {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                setDateFrom(start.toISOString().split("T")[0]);
                setDateTo(today);
                break;
            }
            case "this_year": {
                const start = new Date(now.getFullYear(), 0, 1);
                setDateFrom(start.toISOString().split("T")[0]);
                setDateTo(today);
                break;
            }
            case "all_time": {
                setDateFrom("");
                setDateTo("");
                break;
            }
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [sumRes, orderRes] = await Promise.all([
                api.getFinanceSummary(dateFrom, dateTo),
                api.getOrders(),
            ]);
            setSummary(sumRes);
            setOrders(orderRes.orders);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await api.exportMastersheet();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "PsyShot_Mastersheet.xlsx";
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            console.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const categories = summary?.category_breakdown || {};
    const catEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const totalExpenses = catEntries.reduce((s, [, v]) => s + v, 0) || 1;

    const catColors: Record<string, { bar: string; dot: string }> = {
        supplies: { bar: "bg-[var(--muted)]", dot: "bg-[var(--muted)]" },
        rent: { bar: "bg-[var(--deep-wine)]", dot: "bg-[var(--deep-wine)]" },
        utilities: { bar: "bg-[var(--accent)]", dot: "bg-[var(--accent)]" },
        equipment: { bar: "bg-[var(--primary)]", dot: "bg-[var(--primary)]" },
        marketing: { bar: "bg-[var(--muted-terracotta)]", dot: "bg-[var(--muted-terracotta)]" },
        salary: { bar: "bg-[var(--deep-moss)]", dot: "bg-[var(--deep-moss)]" },
        maintenance: { bar: "bg-amber-600", dot: "bg-amber-600" },
        other: { bar: "bg-zinc-600", dot: "bg-zinc-600" },
    };

    const filteredOrders = orders.filter(o => {
        if (!dateFrom) return true;
        const d = new Date(o.order_date);
        return d >= new Date(dateFrom) && (!dateTo || d <= new Date(dateTo));
    });
    const paymentBreakdown: Record<string, number> = {};
    filteredOrders.forEach(o => {
        const mode = o.payment_mode || "unknown";
        paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + (o.total || 0);
    });
    const paymentEntries = Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1]);
    const totalByPayment = paymentEntries.reduce((s, [, v]) => s + v, 0) || 1;

    const paymentColors: Record<string, string> = {
        cash: "bg-[var(--primary)]",
        upi: "bg-[var(--deep-wine)]",
        card: "bg-[var(--muted)]",
        bank_transfer: "bg-[var(--accent)]",
        unknown: "bg-zinc-600",
    };

    const artistBreakdown: Record<string, { name: string; revenue: number }> = {};
    filteredOrders.forEach(o => {
        const key = o.artist_id || "unassigned";
        const name = o.artists?.name || "Unassigned";
        if (!artistBreakdown[key]) artistBreakdown[key] = { name, revenue: 0 };
        artistBreakdown[key].revenue += o.total || 0;
    });
    const artistEntries = Object.values(artistBreakdown).sort((a, b) => b.revenue - a.revenue);
    const maxArtistRev = artistEntries[0]?.revenue || 1;

    const sourceBreakdown: Record<string, number> = {};
    filteredOrders.forEach(o => {
        const src = o.source || "unknown";
        sourceBreakdown[src] = (sourceBreakdown[src] || 0) + (o.total || 0);
    });
    const sourceEntries = Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]);
    const totalBySource = sourceEntries.reduce((s, [, v]) => s + v, 0) || 1;

    const sourceColors: Record<string, string> = {
        instagram: "bg-[var(--primary)]",
        "walk-in": "bg-[var(--accent)]",
        referral: "bg-[var(--muted-terracotta)]",
        google: "bg-[var(--muted)]",
        unknown: "bg-zinc-600",
    };

    const presets: { key: DatePreset; label: string }[] = [
        { key: "this_week", label: "Week" },
        { key: "this_month", label: "Month" },
        { key: "this_year", label: "Year" },
        { key: "all_time", label: "All" },
    ];

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Finance</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">Revenue, expenses, and profitability analytics</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="neo-btn flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50 cursor-pointer"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Export
                        </button>
                        <Link href="/storeadmin/expenses" className="neo-btn flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer text-[var(--foreground)]">
                            Manage Expenses
                        </Link>
                    </div>
                </div>

                {/* Date Presets */}
                <div className="flex items-center gap-2 mb-6">
                    {presets.map(p => (
                        <button
                            key={p.key}
                            onClick={() => applyPreset(p.key)}
                            className={`px-4 py-2 text-xs font-semibold rounded transition-all cursor-pointer ${activePreset === p.key
                                ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30"
                                : "neo-btn text-[var(--muted)]"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : summary ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="neo-card stat-accent stat-accent-green p-5 animate-fadeIn">
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Revenue</span>
                                    <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-[var(--primary)]">{formatCurrency(summary.revenue)}</p>
                                <p className="text-xs text-[var(--muted)] mt-1">{summary.order_count} orders</p>
                            </div>

                            <div className="neo-card stat-accent stat-accent-red p-5 animate-fadeIn" style={{ animationDelay: "0.05s" }}>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Expenses</span>
                                    <TrendingDown className="w-4 h-4 text-[var(--danger)]" />
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-[var(--danger)]">{formatCurrency(summary.expenses)}</p>
                                <p className="text-xs text-[var(--muted)] mt-1">{summary.expense_count} entries</p>
                            </div>

                            <div className="neo-card stat-accent stat-accent-taupe p-5 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Net Profit</span>
                                    <DollarSign className="w-4 h-4 text-[var(--muted)]" />
                                </div>
                                <p className={`text-3xl font-bold tracking-tight ${summary.profit >= 0 ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}>
                                    {formatCurrency(summary.profit)}
                                </p>
                                <p className="text-xs text-[var(--muted)] mt-1">
                                    {summary.revenue > 0 ? `${((summary.profit / summary.revenue) * 100).toFixed(1)}% margin` : "\u2014"}
                                </p>
                            </div>
                        </div>

                        {/* Analytics Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Revenue by Artist */}
                            <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.15s" }}>
                                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Revenue by Artist
                                </h3>
                                {artistEntries.length === 0 ? (
                                    <p className="text-sm text-[var(--muted)]">No data</p>
                                ) : (
                                    <div className="space-y-3">
                                        {artistEntries.map((artist) => (
                                            <div key={artist.name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm">{artist.name}</span>
                                                    <span className="text-sm font-semibold text-[var(--primary)]">{formatCurrency(artist.revenue)}</span>
                                                </div>
                                                <div className="h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                                                        style={{ width: `${(artist.revenue / maxArtistRev) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Expense Breakdown */}
                            <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.2s" }}>
                                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <PieChart className="w-4 h-4" />
                                    Expense Breakdown
                                </h3>
                                {catEntries.length === 0 ? (
                                    <p className="text-sm text-[var(--muted)]">No expenses</p>
                                ) : (
                                    <>
                                        <div className="flex h-4 rounded-full overflow-hidden mb-4 gap-0.5">
                                            {catEntries.map(([cat, amount]) => (
                                                <div
                                                    key={cat}
                                                    className={`${catColors[cat]?.bar || "bg-zinc-600"} transition-all duration-500`}
                                                    style={{ width: `${(amount / totalExpenses) * 100}%` }}
                                                    title={`${cat}: ${formatCurrency(amount)}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            {catEntries.map(([cat, amount]) => (
                                                <div key={cat} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${catColors[cat]?.dot || "bg-zinc-600"}`} />
                                                        <span className="text-sm capitalize">{cat}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                                                        <span className="text-xs text-[var(--muted)] w-10 text-right">{Math.round((amount / totalExpenses) * 100)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bottom row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Revenue by Payment */}
                            <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.25s" }}>
                                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">
                                    Revenue by Payment Mode
                                </h3>
                                {paymentEntries.length === 0 ? (
                                    <p className="text-sm text-[var(--muted)]">No data</p>
                                ) : (
                                    <>
                                        <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
                                            {paymentEntries.map(([mode, amount]) => (
                                                <div
                                                    key={mode}
                                                    className={`${paymentColors[mode] || "bg-zinc-600"} transition-all duration-500`}
                                                    style={{ width: `${(amount / totalByPayment) * 100}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            {paymentEntries.map(([mode, amount]) => (
                                                <div key={mode} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${paymentColors[mode] || "bg-zinc-600"}`} />
                                                        <span className="text-sm capitalize">{mode}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                                                        <span className="text-xs text-[var(--muted)] w-10 text-right">{Math.round((amount / totalByPayment) * 100)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Revenue by Source */}
                            <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.3s" }}>
                                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4">
                                    Revenue by Source
                                </h3>
                                {sourceEntries.length === 0 ? (
                                    <p className="text-sm text-[var(--muted)]">No data</p>
                                ) : (
                                    <>
                                        <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
                                            {sourceEntries.map(([src, amount]) => (
                                                <div
                                                    key={src}
                                                    className={`${sourceColors[src] || "bg-zinc-600"} transition-all duration-500`}
                                                    style={{ width: `${(amount / totalBySource) * 100}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            {sourceEntries.map(([src, amount]) => (
                                                <div key={src} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${sourceColors[src] || "bg-zinc-600"}`} />
                                                        <span className="text-sm capitalize">{src}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                                                        <span className="text-xs text-[var(--muted)] w-10 text-right">{Math.round((amount / totalBySource) * 100)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}

export default function FinancePage() {
    return <FinanceContent />;
}
