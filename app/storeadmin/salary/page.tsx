"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import { can } from "@/lib/auth/permissions";
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

/**
 * Monthly salary slips.
 *
 * Payroll, so Admin only and never scoped to the person looking: this shows
 * everyone's pay. It deliberately shows the arithmetic rather than just a
 * figure, because each person is on a different formula and a bare number
 * cannot be checked.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const monthRange = (d: Date) => {
    const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from, to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}` };
};

interface Slip {
    artistName: string;
    statedAs: string;
    fixed: number;
    commission: number | null;
    total: number | null;
    basis: { label: string; amount: number; percent: number } | null;
    unresolved?: { question: string; options: Array<{ label: string; amount: number; total: number }> };
    notes: string[];
}

export default function SalaryPage() {
    const { isAuthenticated, loading: authLoading, role } = useAuth();
    const router = useRouter();

    const [month, setMonth] = useState(() => new Date());
    const [slips, setSlips] = useState<Slip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && role && !can(role, "finance.view")) {
            router.push("/storeadmin");
        }
    }, [authLoading, isAuthenticated, role, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            const { from, to } = monthRange(month);
            const res = await api.getSalarySlips(from, to);
            setSlips(res.slips as Slip[]);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not work out the salary slips");
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        if (isAuthenticated && can(role, "finance.view")) load();
    }, [isAuthenticated, role, load]);

    if (authLoading || !isAuthenticated || !can(role, "finance.view")) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const step = (n: number) => {
        const d = new Date(month);
        d.setMonth(d.getMonth() + n);
        setMonth(d);
    };

    const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const payable = slips.reduce((s, x) => s + (x.total ?? 0), 0);

    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="md:ml-60 p-6 md:p-10">
                <header className="mb-6">
                    <h1 className="font-display text-4xl font-bold">Salary Slips</h1>
                    <p className="text-sm text-[var(--muted)] mt-1">
                        Fixed pay plus commission, worked out from this month&apos;s figures.
                    </p>
                </header>

                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => step(-1)} className="p-2 rounded neo-btn" aria-label="Previous month">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-display text-xl min-w-[12rem] text-center">{monthLabel}</span>
                    <button onClick={() => step(1)} className="p-2 rounded neo-btn" aria-label="Next month">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="mb-6 px-4 py-3 rounded border border-[var(--danger)]/40 text-[var(--danger)] text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {slips.map((slip) => (
                                <div
                                    key={slip.artistName}
                                    className="p-5 rounded border border-[var(--border-color)] bg-[var(--surface)]"
                                >
                                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                                        <div>
                                            <h2 className="font-display text-2xl">{slip.artistName}</h2>
                                            <p className="text-[11px] text-[var(--muted)] mt-0.5">{slip.statedAs}</p>
                                        </div>
                                        <p className="font-display text-3xl">
                                            {slip.total === null ? "—" : formatCurrency(slip.total)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                        <div className="px-3 py-2 rounded bg-[var(--surface-hover)]">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Fixed</p>
                                            <p className="mt-0.5">{formatCurrency(slip.fixed)}</p>
                                        </div>
                                        <div className="px-3 py-2 rounded bg-[var(--surface-hover)]">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                                Commission
                                            </p>
                                            <p className="mt-0.5">
                                                {slip.commission === null ? "Not settled" : formatCurrency(slip.commission)}
                                            </p>
                                        </div>
                                        <div className="px-3 py-2 rounded bg-[var(--surface-hover)]">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                                Worked out from
                                            </p>
                                            <p className="mt-0.5">
                                                {slip.basis
                                                    ? `${slip.basis.percent}% of ${formatCurrency(slip.basis.amount)}`
                                                    : "—"}
                                            </p>
                                        </div>
                                    </div>

                                    {slip.basis && (
                                        <p className="text-[11px] text-[var(--muted)] mt-3">{slip.basis.label}</p>
                                    )}

                                    {slip.unresolved && (
                                        <div className="mt-4 p-3 rounded border border-[var(--danger)]/40">
                                            <p className="flex items-center gap-2 text-sm text-[var(--danger)]">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                Needs a decision before this is paid
                                            </p>
                                            <p className="text-[11px] text-[var(--muted)] mt-1">
                                                {slip.unresolved.question}
                                            </p>
                                            <ul className="mt-2 space-y-1 text-sm">
                                                {slip.unresolved.options.map((o) => (
                                                    <li key={o.label} className="flex justify-between gap-4">
                                                        <span className="text-[var(--muted)]">{o.label}</span>
                                                        <span>
                                                            {formatCurrency(o.amount)} → {formatCurrency(o.total)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {slip.notes.length > 0 && (
                                        <ul className="mt-3 space-y-0.5">
                                            {slip.notes.map((n) => (
                                                <li key={n} className="text-[11px] text-[var(--muted)]">
                                                    {n}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-between items-baseline px-5 py-4 rounded border border-[var(--primary)]/30 bg-[var(--surface)]">
                            <span className="text-sm text-[var(--muted)]">Total payable, {monthLabel}</span>
                            <span className="font-display text-2xl">{formatCurrency(payable)}</span>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
