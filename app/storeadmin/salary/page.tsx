"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import { can } from "@/lib/auth/permissions";
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, X } from "lucide-react";

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

interface Adjustment {
    id: string;
    label: string;
    amount: number;
    kind: string;
}

interface Slip {
    artistName: string;
    statedAs: string;
    fixed: number;
    commission: number | null;
    total: number | null;
    basis: { label: string; amount: number; percent: number } | null;
    unresolved?: { question: string; options: Array<{ label: string; amount: number; total: number }> };
    notes: string[];
    adjustments: Adjustment[];
    adjustmentTotal: number;
}

export default function SalaryPage() {
    const { isAuthenticated, loading: authLoading, role } = useAuth();
    const router = useRouter();

    const [month, setMonth] = useState(() => new Date());
    const [slips, setSlips] = useState<Slip[]>([]);
    const [artists, setArtists] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // The add-a-line form, open against one artist at a time.
    const [addingFor, setAddingFor] = useState<string | null>(null);
    const [form, setForm] = useState({ label: "", amount: "", kind: "bonus" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && role && !can(role, "payroll.view")) {
            router.push("/storeadmin");
        }
    }, [authLoading, isAuthenticated, role, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            const { from, to } = monthRange(month);
            const [res, ar] = await Promise.all([api.getSalarySlips(from, to), api.getArtists()]);
            setSlips(res.slips as Slip[]);
            setArtists(ar.artists as Array<{ id: string; name: string }>);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not work out the salary slips");
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        if (isAuthenticated && can(role, "payroll.view")) load();
    }, [isAuthenticated, role, load]);

    if (authLoading || !isAuthenticated || !can(role, "payroll.view")) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const addLine = async (artistName: string) => {
        const artist = artists.find((a) => a.name === artistName);
        if (!artist) return setError(`No artist record for ${artistName}`);
        setSaving(true);
        setError(null);
        try {
            const { from } = monthRange(month);
            await api.createManualEntry({
                scope: "salary",
                artist_id: artist.id,
                // Dated to the first of the month on screen, so the line lands in
                // the period it is being added to rather than today's month.
                entry_date: from,
                label: form.label.trim(),
                amount: Number(form.amount),
                kind: form.kind,
            });
            setAddingFor(null);
            setForm({ label: "", amount: "", kind: "bonus" });
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

                                    {(slip.adjustments.length > 0 || addingFor === slip.artistName) && (
                                        <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                                                Added by hand
                                            </p>
                                            <ul className="space-y-1 text-sm">
                                                {slip.adjustments.map((a) => (
                                                    <li key={a.id} className="flex justify-between items-center gap-4">
                                                        <span className="text-[var(--muted)]">{a.label}</span>
                                                        <span className="flex items-center gap-3">
                                                            <span className={a.amount < 0 ? "text-[var(--danger)]" : ""}>
                                                                {formatCurrency(a.amount)}
                                                            </span>
                                                            <button
                                                                onClick={() => removeLine(a.id)}
                                                                className="text-[var(--muted)] hover:text-[var(--danger)]"
                                                                title="Remove this line"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {slip.adjustmentTotal !== 0 && (
                                                <p className="text-[11px] text-[var(--muted)] mt-2">
                                                    Adjustments total {formatCurrency(slip.adjustmentTotal)}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {addingFor === slip.artistName ? (
                                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                                            <select
                                                value={form.kind}
                                                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                                                className="px-2 py-1.5 neo-input text-sm"
                                            >
                                                <option value="bonus">Bonus</option>
                                                <option value="deduction">Deduction</option>
                                            </select>
                                            <input
                                                value={form.label}
                                                onChange={(e) => setForm({ ...form, label: e.target.value })}
                                                placeholder="What is it for?"
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
                                                onClick={() => addLine(slip.artistName)}
                                                disabled={saving || !form.label.trim() || !form.amount}
                                                className="px-3 py-1.5 rounded neo-btn text-sm disabled:opacity-40"
                                            >
                                                {saving ? "Saving…" : "Add"}
                                            </button>
                                            <button
                                                onClick={() => setAddingFor(null)}
                                                className="px-2 py-1.5 text-sm text-[var(--muted)]"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setAddingFor(slip.artistName); setForm({ label: "", amount: "", kind: "bonus" }); }}
                                            className="mt-3 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] underline"
                                        >
                                            Add a bonus or deduction
                                        </button>
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
