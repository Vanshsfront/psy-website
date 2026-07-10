"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import DailyNotesPanel from "@/components/storeadmin/DailyNotesPanel";
import { api } from "@/lib/storeadmin/api";
import { canonicalKey, formatCurrency } from "@/lib/storeadmin/utils";
import {
    type DatePreset,
    describeRange,
    inDayRange,
    presetRange,
} from "@/lib/storeadmin/date-range";
import type { FinancialSummary, Order } from "@/types/storeadmin";
import {
    TrendingUp,
    Wallet,
    DollarSign,
    Loader2,
    Download,
    BarChart3,
    PieChart,
} from "lucide-react";
import Link from "next/link";

/** Footer that lets a reader check a panel's rows against the headline figure. */
function PanelTotal({ label, amount }: { label: string; amount: number }) {
    return (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
            <span className="text-sm font-bold tabular-nums">{formatCurrency(amount)}</span>
        </div>
    );
}

function FinanceContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [activePreset, setActivePreset] = useState<DatePreset>("this_month");
    // Presets read the browser's clock, so they can only be resolved after mount.
    const [rangeReady, setRangeReady] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [artistFilter, setArtistFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [sourceFilter, setSourceFilter] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const { from, to } = presetRange("this_month");
        setDateFrom(from);
        setDateTo(to);
        setRangeReady(true);
    }, []);

    useEffect(() => {
        if (isAuthenticated && rangeReady) loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, rangeReady, dateFrom, dateTo]);

    const applyPreset = (preset: DatePreset) => {
        setActivePreset(preset);
        if (preset === "custom") return;
        const { from, to } = presetRange(preset);
        setDateFrom(from);
        setDateTo(to);
    };

    /** Typing a date means the range is no longer one of the named periods. */
    const setCustomRange = (from: string, to: string) => {
        setActivePreset(from || to ? "custom" : "all_time");
        setDateFrom(from);
        setDateTo(to);
    };

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [sumRes, orderRes] = await Promise.all([
                api.getFinanceSummary(dateFrom, dateTo),
                api.getOrders(),
            ]);
            setSummary(sumRes);
            setOrders(orderRes.orders);
        } catch (err) {
            console.error(err);
            setError("Could not load finance data. Refresh to try again.");
            setSummary(null);
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
    const expenseTotal = catEntries.reduce((s, [, v]) => s + v, 0);
    // Guard the percentage maths only; never show `1` as a total.
    const expenseDivisor = expenseTotal || 1;

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

    const artistKey = (o: Order) => o.artist_id || "unassigned";
    const paymentKey = (o: Order) => canonicalKey(o.payment_mode || "unknown");
    const sourceKey = (o: Order) => canonicalKey(o.source || "unknown");

    const inRange = orders.filter(o => inDayRange(o.order_date, dateFrom, dateTo));

    // Single source of truth: the revenue KPI and every breakdown below are
    // summed from this one array, so the cards and the charts cannot disagree.
    const filteredOrders = inRange.filter(
        o =>
            (!artistFilter || artistKey(o) === artistFilter) &&
            (!paymentFilter || paymentKey(o) === paymentFilter) &&
            (!sourceFilter || sourceKey(o) === sourceFilter)
    );
    const revenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
    const orderCount = filteredOrders.length;
    const filtersActive = Boolean(artistFilter || paymentFilter || sourceFilter);

    // Option lists come from the date range, not the narrowed set, so choosing
    // one value doesn't make the others vanish from their dropdowns.
    const artistOptions = Array.from(
        new Map(inRange.map(o => [artistKey(o), o.artists?.name || "Unassigned"])).entries()
    ).sort((a, b) => a[1].localeCompare(b[1]));
    const paymentOptions = Array.from(new Set(inRange.map(paymentKey))).sort();
    const sourceOptions = Array.from(new Set(inRange.map(sourceKey))).sort();

    // Each breakdown partitions `filteredOrders`, so all three sum to `revenue`.
    const revenueDivisor = revenue || 1;

    const periodLabels: Record<DatePreset, string> = {
        this_week: "This week",
        this_month: "This month",
        this_year: "This year",
        all_time: "All time",
        custom: "Custom range",
    };
    const periodLabel = periodLabels[activePreset];

    const paymentBreakdown: Record<string, number> = {};
    filteredOrders.forEach(o => {
        const mode = canonicalKey(o.payment_mode || "unknown");
        paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + (o.total || 0);
    });
    const paymentEntries = Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1]);

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
        const src = canonicalKey(o.source || "unknown");
        sourceBreakdown[src] = (sourceBreakdown[src] || 0) + (o.total || 0);
    });
    const sourceEntries = Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]);

    const sourceColors: Record<string, string> = {
        instagram: "bg-[var(--primary)]",
        "walk-in": "bg-[var(--accent)]",
        referral: "bg-[var(--muted-terracotta)]",
        google: "bg-[var(--muted)]",
        unknown: "bg-zinc-600",
    };

    // "custom" is never a button — it's what the from/to inputs select implicitly.
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
                            Petty Cash
                        </Link>
                    </div>
                </div>

                {/* Date range: named presets, plus an explicit from/to */}
                <div className="mb-6 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
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

                    {/* Explicit from/to. Editing either drops the preset highlight,
                        because the range is no longer one of the named periods. */}
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs text-[var(--muted)] w-9" htmlFor="finance-date-from">
                            From
                        </label>
                        <input
                            id="finance-date-from"
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={(e) => setCustomRange(e.target.value, dateTo)}
                            className="neo-input px-3 py-2 text-sm [color-scheme:dark]"
                        />
                        <label className="text-xs text-[var(--muted)] w-6 text-center" htmlFor="finance-date-to">
                            To
                        </label>
                        <input
                            id="finance-date-to"
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(e) => setCustomRange(dateFrom, e.target.value)}
                            className="neo-input px-3 py-2 text-sm [color-scheme:dark]"
                        />
                        {(dateFrom || dateTo) && (
                            <button
                                onClick={() => applyPreset("all_time")}
                                className="text-xs text-[var(--muted)] hover:text-[var(--danger)] px-2 py-1 cursor-pointer"
                            >
                                Clear dates
                            </button>
                        )}
                    </div>

                    {/* Order filters — these narrow the revenue KPI and all three
                        revenue charts together, so the panels stay in agreement. */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            aria-label="Filter by artist"
                            value={artistFilter}
                            onChange={(e) => setArtistFilter(e.target.value)}
                            className="neo-input px-3 py-2 text-sm cursor-pointer"
                        >
                            <option value="">All artists</option>
                            {artistOptions.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter by payment mode"
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            className="neo-input px-3 py-2 text-sm cursor-pointer capitalize"
                        >
                            <option value="">All payment modes</option>
                            {paymentOptions.map(m => (
                                <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter by source"
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="neo-input px-3 py-2 text-sm cursor-pointer capitalize"
                        >
                            <option value="">All sources</option>
                            {sourceOptions.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        {filtersActive && (
                            <button
                                onClick={() => {
                                    setArtistFilter("");
                                    setPaymentFilter("");
                                    setSourceFilter("");
                                }}
                                className="text-xs text-[var(--muted)] hover:text-[var(--danger)] px-2 py-1 cursor-pointer"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    {rangeReady && (
                        <p className="text-xs text-[var(--muted)]">
                            Showing <span className="text-[var(--foreground)]">{describeRange(dateFrom, dateTo)}</span>
                            {filtersActive && (
                                <> · <span className="text-[var(--foreground)]">{orderCount}</span> of {inRange.length} orders in range</>
                            )}
                        </p>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : error ? (
                    <div className="glass-panel p-6 text-sm text-[var(--danger)]">{error}</div>
                ) : summary ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="neo-card stat-accent stat-accent-green p-5 animate-fadeIn">
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Revenue · {periodLabel}</span>
                                    <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-[var(--primary)]">{formatCurrency(revenue)}</p>
                                <p className="text-xs text-[var(--muted)] mt-1">{orderCount} orders</p>
                            </div>

                            <div className="neo-card stat-accent stat-accent-gold p-5 animate-fadeIn" style={{ animationDelay: "0.05s" }}>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Petty Cash Balance</span>
                                    <Wallet className="w-4 h-4 text-[var(--accent)]" />
                                </div>
                                <p className={`text-3xl font-bold tracking-tight ${summary.petty_cash_balance >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                                    {formatCurrency(summary.petty_cash_balance)}
                                </p>
                                <p className="text-xs text-[var(--muted)] mt-1">All-time, top-ups minus expenses</p>
                            </div>

                            <div className="neo-card stat-accent stat-accent-taupe p-5 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Petty Expenses</span>
                                    <DollarSign className="w-4 h-4 text-[var(--muted)]" />
                                </div>
                                <p className="text-3xl font-bold tracking-tight text-[var(--muted)]">
                                    {formatCurrency(summary.expenses)}
                                </p>
                                <p className="text-xs text-[var(--muted)] mt-1">
                                    {summary.expense_count} in range · not deducted from revenue
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
                                        <PanelTotal label="Total revenue" amount={revenue} />
                                    </div>
                                )}
                            </div>

                            {/* Expense Breakdown */}
                            <div className="glass-panel p-5 animate-fadeIn" style={{ animationDelay: "0.2s" }}>
                                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <PieChart className="w-4 h-4" />
                                    Expense Breakdown
                                </h3>
                                <p className="text-xs text-[var(--muted)] mb-4 normal-case tracking-normal">
                                    Date range only{filtersActive ? " — order filters don't apply to expenses" : ""}
                                </p>
                                {catEntries.length === 0 ? (
                                    <p className="text-sm text-[var(--muted)]">No expenses</p>
                                ) : (
                                    <>
                                        <div className="flex h-4 rounded-full overflow-hidden mb-4 gap-0.5">
                                            {catEntries.map(([cat, amount]) => (
                                                <div
                                                    key={cat}
                                                    className={`${catColors[cat]?.bar || "bg-zinc-600"} transition-all duration-500`}
                                                    style={{ width: `${(amount / expenseDivisor) * 100}%` }}
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
                                                        <span className="text-xs text-[var(--muted)] w-10 text-right">{Math.round((amount / expenseDivisor) * 100)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <PanelTotal label="Total expenses" amount={expenseTotal} />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Daily tally notes — sticky-note style log */}
                        <div className="mb-6">
                            <DailyNotesPanel dateFrom={dateFrom || undefined} dateTo={dateTo || undefined} />
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
                                                    style={{ width: `${(amount / revenueDivisor) * 100}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            {paymentEntries.map(([mode, amount]) => (
                                                <div key={mode} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${paymentColors[mode] || "bg-zinc-600"}`} />
                                                        <span className="text-sm capitalize">{mode.replace(/_/g, " ")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                                                        <span className="text-xs text-[var(--muted)] w-10 text-right">{Math.round((amount / revenueDivisor) * 100)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <PanelTotal label="Total revenue" amount={revenue} />
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
                                                    style={{ width: `${(amount / revenueDivisor) * 100}%` }}
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
                                                        <span className="text-xs text-[var(--muted)] w-10 text-right">{Math.round((amount / revenueDivisor) * 100)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <PanelTotal label="Total revenue" amount={revenue} />
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
