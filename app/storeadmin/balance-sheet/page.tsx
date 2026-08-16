"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import type { BalanceSheet } from "@/types/storeadmin";
import { Loader2, ChevronRight, ChevronDown, ChevronLeft } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const monthRange = (d: Date) => {
    const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from, to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}` };
};

const MODE_LABEL: Record<string, string> = {
    upi: "Business — UPI",
    cash: "Business — Cash",
    card: "Business — Card",
    unrecorded: "Not recorded",
};

export default function BalanceSheetPage() {
    const { isAuthenticated, loading: authLoading, role } = useAuth();
    const router = useRouter();

    const [month, setMonth] = useState(() => new Date());
    const [sheet, setSheet] = useState<BalanceSheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
        if (!authLoading && isAuthenticated && role && role !== "superadmin") {
            router.push("/storeadmin");
        }
    }, [authLoading, isAuthenticated, role, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            const { from, to } = monthRange(month);
            setSheet(await api.getBalanceSheet(from, to));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load the balance sheet");
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        if (isAuthenticated && role === "superadmin") load();
    }, [isAuthenticated, role, load]);

    const toggle = (cat: string) =>
        setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });

    if (authLoading || !isAuthenticated || role !== "superadmin") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const shift = (n: number) => {
        const d = new Date(month);
        d.setMonth(d.getMonth() + n);
        setMonth(d);
    };

    const categories = sheet
        ? Object.entries(sheet.expenses_by_category).sort((a, b) => b[1].total - a[1].total)
        : [];

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-60 p-6 md:p-10">
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <h1 className="font-display text-4xl font-bold">Balance Sheet</h1>
                        <p className="text-sm text-[var(--muted)] mt-1">
                            {sheet ? `${sheet.order_count} orders · ${sheet.expense_count} expenses` : "—"}
                        </p>
                    </div>
                    <button onClick={() => shift(-1)} className="p-2 neo-btn rounded"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="font-display text-xl min-w-[150px] text-center">
                        {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </span>
                    <button onClick={() => shift(1)} className="p-2 neo-btn rounded"><ChevronRight className="w-4 h-4" /></button>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-3 rounded border border-[var(--danger)] text-[var(--danger)] text-sm">{error}</div>
                )}

                {loading || !sheet ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Receivables */}
                            <div className="rounded border border-[var(--border-color)] overflow-hidden">
                                <div className="px-5 py-3 bg-[var(--surface)] border-b border-[var(--border-color)]">
                                    <h2 className="font-display text-lg">Receivables</h2>
                                </div>
                                {Object.entries(sheet.receivables)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([mode, amount]) => (
                                        <div key={mode} className="flex justify-between px-5 py-3 border-b border-[var(--border-color)] text-sm">
                                            <span>{MODE_LABEL[mode] ?? mode}</span>
                                            <span className="tabular-nums">{formatCurrency(amount)}</span>
                                        </div>
                                    ))}
                                <div className="flex justify-between px-5 py-3 font-medium">
                                    <span>Total</span>
                                    <span className="tabular-nums text-[var(--accent)]">{formatCurrency(sheet.total_receivables)}</span>
                                </div>
                            </div>

                            {/* Expenses, rolled up and expandable */}
                            <div className="rounded border border-[var(--border-color)] overflow-hidden">
                                <div className="px-5 py-3 bg-[var(--surface)] border-b border-[var(--border-color)]">
                                    <h2 className="font-display text-lg">Expenses</h2>
                                </div>
                                {categories.length === 0 && (
                                    <div className="px-5 py-6 text-sm text-[var(--muted)]">No expenses this month.</div>
                                )}
                                {categories.map(([cat, data]) => {
                                    const isOpen = open.has(cat);
                                    return (
                                        <div key={cat} className="border-b border-[var(--border-color)]">
                                            <button
                                                onClick={() => toggle(cat)}
                                                className="w-full flex justify-between items-center px-5 py-3 text-sm hover:bg-[var(--surface-hover)]"
                                            >
                                                <span className="flex items-center gap-2 capitalize">
                                                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    {cat}
                                                    <span className="text-[var(--muted)] text-xs">({data.items.length})</span>
                                                </span>
                                                <span className="tabular-nums">{formatCurrency(data.total)}</span>
                                            </button>
                                            {isOpen && (
                                                <div className="bg-[var(--surface)]">
                                                    {data.items.map((item, i) => (
                                                        <div key={i} className="flex justify-between px-5 py-2 pl-11 text-xs text-[var(--muted)]">
                                                            <span className="truncate pr-3">
                                                                {item.label}
                                                                {item.type === "petty" && (
                                                                    <span className="ml-2 text-[10px] uppercase tracking-wider">petty</span>
                                                                )}
                                                            </span>
                                                            <span className="tabular-nums shrink-0">{formatCurrency(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="flex justify-between px-5 py-3 font-medium">
                                    <span>Total</span>
                                    <span className="tabular-nums text-[var(--danger)]">{formatCurrency(sheet.total_expenses)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded border border-[var(--border-color)] px-6 py-5 flex justify-between items-center flex-wrap gap-2">
                            <span className="font-display text-2xl">Net Profit</span>
                            <span
                                className={`font-display text-3xl tabular-nums ${
                                    sheet.net_profit >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"
                                }`}
                            >
                                {formatCurrency(sheet.net_profit)}
                            </span>
                        </div>

                        <p className="text-xs text-[var(--muted)] mt-4 max-w-2xl">
                            Receivables are orders in this month grouped by how the money came in.
                            Expenses exclude petty-cash top-ups, which move money between the float
                            and the till rather than spending it.
                        </p>
                    </>
                )}
            </main>
        </div>
    );
}
