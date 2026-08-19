"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency, formatDate } from "@/lib/storeadmin/utils";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * What the signed-in person has earned.
 *
 * Deliberately not the Finance screen. That one is the studio's revenue,
 * expenses and profit and stays Admin-only; Yogesh asked for Executives to see
 * "their own earnings only". The API takes the artist id from the account, so
 * this page has no way to ask about anyone else even if it wanted to.
 *
 * Managers and Admins can open it too and see their own figures, which are
 * empty unless their login is linked to an artist. That is why the empty state
 * explains the link rather than just showing zero.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const monthRange = (d: Date) => {
    const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from, to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}` };
};

interface EarningsOrder {
    id: string;
    order_date?: string;
    service_description?: string | null;
    total?: number | null;
    deposit?: number | null;
    payment_mode?: string | null;
    customers?: { name?: string } | null;
}

interface Earnings {
    orderCount: number;
    revenue: number;
    deposits: number;
    balance: number;
    orders: EarningsOrder[];
}

export default function MyEarningsPage() {
    const { isAuthenticated, loading: authLoading, username } = useAuth();
    const router = useRouter();

    const [month, setMonth] = useState(() => new Date());
    const [data, setData] = useState<Earnings | null>(null);
    const [linked, setLinked] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            const { from, to } = monthRange(month);
            const res = await api.getMyEarnings({ from, to });
            setData(res.earnings as unknown as Earnings);
            setLinked(res.linkedToArtist);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load your earnings");
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        if (isAuthenticated) load();
    }, [isAuthenticated, load]);

    if (authLoading || !isAuthenticated) {
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
    const orders = data?.orders ?? [];

    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="md:ml-60 p-6 md:p-10">
                <header className="mb-6">
                    <h1 className="font-display text-4xl font-bold">My Earnings</h1>
                    <p className="text-sm text-[var(--muted)] mt-1">
                        {username ? `Signed in as ${username}. ` : ""}Your own completed work only.
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

                {!linked && !loading && (
                    <div className="mb-6 px-4 py-3 rounded border border-[var(--border-color)] text-sm text-[var(--muted)]">
                        This login is not linked to an artist, so there is nothing to total up. An Admin can link it
                        from the Logins screen.
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: "Jobs", value: String(data?.orderCount ?? 0) },
                                { label: "Total billed", value: formatCurrency(data?.revenue ?? 0) },
                                { label: "Deposits taken", value: formatCurrency(data?.deposits ?? 0) },
                                { label: "Balance collected", value: formatCurrency(data?.balance ?? 0) },
                            ].map((kpi) => (
                                <div
                                    key={kpi.label}
                                    className="p-5 rounded border border-[var(--border-color)] bg-[var(--surface)]"
                                >
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{kpi.label}</p>
                                    <p className="font-display text-2xl mt-1">{kpi.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded border border-[var(--border-color)] bg-[var(--surface)] overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border-color)]">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Work</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted)]">
                                                Nothing recorded in {monthLabel}.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((o) => (
                                            <tr key={o.id} className="border-b border-[var(--border-color)] last:border-0">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {o.order_date ? formatDate(o.order_date) : "-"}
                                                </td>
                                                <td className="px-4 py-3">{o.customers?.name ?? "-"}</td>
                                                <td className="px-4 py-3 text-[var(--muted)]">
                                                    {o.service_description ?? "-"}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {formatCurrency(Number(o.total) || 0)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
