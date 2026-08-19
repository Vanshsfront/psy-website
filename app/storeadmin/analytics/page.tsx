"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import { canOpen } from "@/lib/auth/permissions";
import type { AnalyticsResult, Grain } from "@/lib/storeadmin/server/analytics";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * The analytics Yogesh specified: ticket size by artist month on month, order
 * counts week/month/quarter split by artist and source with growth, service mix
 * per artist, and appointments by artist and by source.
 *
 * Deliberately plain tables rather than charts. Every number here gets compared
 * against another number, and a table makes the comparison legible without a
 * charting library; growth is shown as an explicit figure rather than a slope
 * the reader has to estimate.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Growth({ value }: { value: number | null }) {
    if (value === null) {
        return <span className="text-[var(--muted)]">-</span>;
    }
    const flat = Math.abs(value) < 0.5;
    const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;
    const tone = flat ? "text-[var(--muted)]" : value > 0 ? "text-[var(--accent)]" : "text-[var(--danger)]";
    return (
        <span className={`inline-flex items-center gap-1 ${tone}`}>
            <Icon className="w-3.5 h-3.5" />
            {value > 0 ? "+" : ""}
            {value.toFixed(0)}%
        </span>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-8">
            <h2 className="font-display text-2xl mb-3">{title}</h2>
            <div className="rounded border border-[var(--border-color)] bg-[var(--surface)] overflow-x-auto">
                {children}
            </div>
        </section>
    );
}

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={`px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--muted)] ${right ? "text-right" : "text-left"}`}>
        {children}
    </th>
);
const TD = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <td className={`px-4 py-2.5 ${right ? "text-right tabular-nums" : ""}`}>{children}</td>
);

export default function AnalyticsPage() {
    const { isAuthenticated, loading: authLoading, role } = useAuth();
    const router = useRouter();

    const [grain, setGrain] = useState<Grain>("month");
    const [artistId, setArtistId] = useState("");
    const [months, setMonths] = useState(6);
    const [data, setData] = useState<AnalyticsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && role && !canOpen(role, "/storeadmin/analytics")) {
            router.push("/storeadmin");
        }
    }, [authLoading, isAuthenticated, role, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            const to = new Date();
            const from = new Date();
            from.setMonth(from.getMonth() - months);
            const res = await api.getAnalytics({
                from: iso(from),
                to: iso(to),
                grain,
                artist_id: artistId || undefined,
            });
            setData(res.analytics);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load analytics");
        } finally {
            setLoading(false);
        }
    }, [grain, artistId, months]);

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

    const grainLabel = { week: "Week on week", month: "Month on month", quarter: "Quarter on quarter" }[grain];

    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="md:ml-60 p-6 md:p-10">
                <header className="mb-6">
                    <h1 className="font-display text-4xl font-bold">Analytics</h1>
                    <p className="text-sm text-[var(--muted)] mt-1">
                        Volume, ticket size and growth, by artist and by channel.
                    </p>
                </header>

                <div className="flex flex-wrap gap-3 mb-6">
                    <select
                        value={grain}
                        onChange={(e) => setGrain(e.target.value as Grain)}
                        className="px-3 py-2 neo-input text-sm"
                    >
                        <option value="week">Week on week</option>
                        <option value="month">Month on month</option>
                        <option value="quarter">Quarter on quarter</option>
                    </select>
                    <select
                        value={months}
                        onChange={(e) => setMonths(Number(e.target.value))}
                        className="px-3 py-2 neo-input text-sm"
                    >
                        <option value={3}>Last 3 months</option>
                        <option value={6}>Last 6 months</option>
                        <option value={12}>Last 12 months</option>
                        <option value={36}>Last 3 years</option>
                    </select>
                    <select
                        value={artistId}
                        onChange={(e) => setArtistId(e.target.value)}
                        className="px-3 py-2 neo-input text-sm"
                    >
                        <option value="">All artists</option>
                        {(data?.artists ?? []).map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
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
                ) : data ? (
                    <>
                        {data.notes.length > 0 && (
                            <ul className="mb-6 space-y-1">
                                {data.notes.map((n) => (
                                    <li key={n} className="text-[11px] text-[var(--muted)]">
                                        {n}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <Panel title={`${grainLabel}: volume, revenue and growth`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)]">
                                        <TH>Period</TH>
                                        <TH right>Orders</TH>
                                        <TH right>Revenue</TH>
                                        <TH right>Deposits</TH>
                                        <TH right>Ticket size</TH>
                                        <TH right>Growth</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.timeline.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">
                                                Nothing in this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.timeline.map((p, i) => (
                                            <tr key={p.bucket} className="border-b border-[var(--border-color)] last:border-0">
                                                <TD>{p.bucket}</TD>
                                                <TD right>{p.orders}</TD>
                                                <TD right>{formatCurrency(p.revenue)}</TD>
                                                <TD right>{formatCurrency(p.deposits)}</TD>
                                                <TD right>{formatCurrency(data.ticketSize[i]?.average ?? 0)}</TD>
                                                <TD right>
                                                    <Growth value={p.growth} />
                                                </TD>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </Panel>

                        <Panel title="By artist">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)]">
                                        <TH>Artist</TH>
                                        <TH right>Orders</TH>
                                        <TH right>Revenue</TH>
                                        <TH right>Ticket size</TH>
                                        <TH right>Latest growth</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.byArtist.map((a) => (
                                        <tr key={a.name} className="border-b border-[var(--border-color)] last:border-0">
                                            <TD>{a.name}</TD>
                                            <TD right>{a.orders}</TD>
                                            <TD right>{formatCurrency(a.total)}</TD>
                                            <TD right>{formatCurrency(a.orders ? a.total / a.orders : 0)}</TD>
                                            <TD right>
                                                <Growth value={a.points[a.points.length - 1]?.growth ?? null} />
                                            </TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Panel>

                        <Panel title="By channel">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)]">
                                        <TH>Channel</TH>
                                        <TH right>Orders</TH>
                                        <TH right>Revenue</TH>
                                        <TH right>Latest growth</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.bySource.map((s) => (
                                        <tr key={s.source} className="border-b border-[var(--border-color)] last:border-0">
                                            <TD>{s.source}</TD>
                                            <TD right>{s.orders}</TD>
                                            <TD right>{formatCurrency(s.total)}</TD>
                                            <TD right>
                                                <Growth value={s.points[s.points.length - 1]?.growth ?? null} />
                                            </TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Panel>

                        <Panel title="Service mix by artist">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)]">
                                        <TH>Artist</TH>
                                        <TH right>Tattoos</TH>
                                        <TH right>Piercings</TH>
                                        <TH right>Jewellery</TH>
                                        <TH right>Unclassified</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.serviceMix.map((m) => (
                                        <tr key={m.name} className="border-b border-[var(--border-color)] last:border-0">
                                            <TD>{m.name}</TD>
                                            <TD right>{m.tattoo}</TD>
                                            <TD right>{m.piercing}</TD>
                                            <TD right>{m.jewellery}</TD>
                                            <TD right>{m.other}</TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Panel>

                        <Panel title="Appointments booked by artist">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)]">
                                        <TH>Artist</TH>
                                        {(data.appointmentsByArtist[0]?.points ?? []).map((p) => (
                                            <TH key={p.bucket} right>
                                                {p.bucket}
                                            </TH>
                                        ))}
                                        <TH right>Total</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.appointmentsByArtist.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-10 text-center text-[var(--muted)]">
                                                No appointments in this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.appointmentsByArtist.map((a) => (
                                            <tr key={a.name} className="border-b border-[var(--border-color)] last:border-0">
                                                <TD>{a.name}</TD>
                                                {a.points.map((p) => (
                                                    <TD key={p.bucket} right>
                                                        {p.count}
                                                    </TD>
                                                ))}
                                                <TD right>{a.total}</TD>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </Panel>

                        <Panel title="Appointments by channel">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)]">
                                        <TH>Channel</TH>
                                        <TH right>Appointments</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.appointmentsBySource.length === 0 ? (
                                        <tr>
                                            <td colSpan={2} className="px-4 py-10 text-center text-[var(--muted)]">
                                                No appointments in this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.appointmentsBySource.map((s) => (
                                            <tr key={s.source} className="border-b border-[var(--border-color)] last:border-0">
                                                <TD>{s.source}</TD>
                                                <TD right>{s.count}</TD>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </Panel>
                    </>
                ) : null}
            </main>
        </div>
    );
}
