"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import type { BalanceSheet } from "@/types/storeadmin";
import { Loader2, ChevronRight, ChevronDown, ChevronLeft, X } from "lucide-react";
import { can } from "@/lib/auth/permissions";

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

    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({ label: "", amount: "", kind: "expense" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
        if (!authLoading && isAuthenticated && role && !can(role, "balanceSheet.view")) {
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
        if (isAuthenticated && can(role, "balanceSheet.view")) load();
    }, [isAuthenticated, role, load]);

    const toggle = (cat: string) =>
        setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });

    if (authLoading || !isAuthenticated || !can(role, "balanceSheet.view")) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const addLine = async () => {
        setSaving(true);
        setError(null);
        try {
            const { from } = monthRange(month);
            await api.createManualEntry({
                scope: "balance_sheet",
                // Dated to the first of the month on screen, so the line lands in
                // the period being edited rather than today's month.
                entry_date: from,
                label: form.label.trim(),
                amount: Number(form.amount),
                kind: form.kind,
            });
            setAdding(false);
            setForm({ label: "", amount: "", kind: "expense" });
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not add that line");
        } finally {
            setSaving(false);
        }
    };

    const removeLine = async (id: string) => {
        setError(null);
        try {
            await api.deleteManualEntry(id);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not remove that line");
        }
    };

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
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10">
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

                        {/* Hand-entered lines. Yogesh: "I will have to add expenses,
                            incomes beyond what reflects dynamically as well". Kept as
                            their own section so the computed sheet and what was added
                            to it stay separately auditable. */}
                        <div className="mt-6 rounded border border-[var(--border-color)] px-6 py-5">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-display text-xl">Added by hand</span>
                                {!adding && (
                                    <button
                                        onClick={() => setAdding(true)}
                                        className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] underline"
                                    >
                                        Add income or expense
                                    </button>
                                )}
                            </div>

                            {(sheet.manual_entries ?? []).length === 0 && !adding && (
                                <p className="text-sm text-[var(--muted)]">
                                    Nothing added for this month. Rent, salaries and cash costs that are not
                                    logged as expenses can go here.
                                </p>
                            )}

                            <ul className="space-y-1 text-sm">
                                {(sheet.manual_entries ?? []).map((m) => (
                                    <li key={m.id} className="flex justify-between items-center gap-4">
                                        <span className="text-[var(--muted)]">{m.label}</span>
                                        <span className="flex items-center gap-3">
                                            <span className={`tabular-nums ${m.amount < 0 ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
                                                {formatCurrency(m.amount)}
                                            </span>
                                            <button
                                                onClick={() => removeLine(m.id)}
                                                className="text-[var(--muted)] hover:text-[var(--danger)]"
                                                title="Remove this line"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {adding && (
                                <div className="mt-3 flex flex-wrap gap-2 items-center">
                                    <select
                                        value={form.kind}
                                        onChange={(e) => setForm({ ...form, kind: e.target.value })}
                                        className="px-2 py-1.5 neo-input text-sm"
                                    >
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                    </select>
                                    <input
                                        value={form.label}
                                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                                        placeholder="What is it?"
                                        className="px-2 py-1.5 neo-input text-sm flex-1 min-w-[10rem]"
                                    />
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        placeholder="Amount"
                                        className="px-2 py-1.5 neo-input text-sm w-28"
                                    />
                                    <button
                                        onClick={addLine}
                                        disabled={saving || !form.label.trim() || !form.amount}
                                        className="px-3 py-1.5 rounded neo-btn text-sm disabled:opacity-40"
                                    >
                                        {saving ? "Saving…" : "Add"}
                                    </button>
                                    <button onClick={() => setAdding(false)} className="px-2 py-1.5 text-sm text-[var(--muted)]">
                                        Cancel
                                    </button>
                                </div>
                            )}
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
