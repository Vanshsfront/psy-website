"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import AppointmentCalendar, { type CalendarView } from "@/components/storeadmin/AppointmentCalendar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import type { Appointment, Artist, Customer } from "@/types/storeadmin";
import { Loader2, Plus, ChevronLeft, ChevronRight, X, Check, Trash2 } from "lucide-react";
import { OWN_RECORDS_ONLY } from "@/lib/auth/permissions";

const dayKey = (d: Date) => {
    // Local calendar day, not UTC: toISOString() would roll over at 05:30 IST
    // and show the previous day's bookings for most of the morning.
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const addDays = (d: Date, n: number) => {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
};

export default function AppointmentsPage() {
    const { isAuthenticated, loading: authLoading, role } = useAuth();
    const router = useRouter();

    const [day, setDay] = useState(() => new Date());
    const [view, setView] = useState<CalendarView>("day");
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selected, setSelected] = useState<Appointment | null>(null);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [form, setForm] = useState({
        artist_id: "",
        time: "12:00",
        duration: "60",
        service_description: "",
        deposit: "",
        estimated_total: "",
        notes: "",
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            // Fetch exactly the window the view renders, so switching to month
            // does not quietly show a single day's bookings in a month grid.
            let start = day;
            let end = addDays(day, 1);
            if (view === "week") {
                start = addDays(day, -day.getDay());
                end = addDays(start, 7);
            } else if (view === "month") {
                const first = new Date(day.getFullYear(), day.getMonth(), 1);
                start = addDays(first, -first.getDay());
                end = addDays(start, 42); // six weeks covers any month layout
            }
            const from = `${dayKey(start)}T00:00:00`;
            const to = `${dayKey(end)}T00:00:00`;
            const [a, ar] = await Promise.all([
                api.getAppointments({ from, to }),
                api.getArtists(),
            ]);
            setAppointments(a.appointments);
            setArtists(ar.artists);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load appointments");
        } finally {
            setLoading(false);
        }
    }, [day, view]);

    useEffect(() => {
        if (isAuthenticated) load();
    }, [isAuthenticated, load]);

    const create = async () => {
        if (!customer) return setError("Pick a customer first");
        setSaving(true);
        setError(null);
        try {
            const startsAt = new Date(`${dayKey(day)}T${form.time}:00`);
            const mins = parseInt(form.duration, 10);
            const endsAt = mins > 0 ? new Date(startsAt.getTime() + mins * 60000) : null;

            await api.createAppointment({
                customer_id: customer.id,
                artist_id: form.artist_id || null,
                starts_at: startsAt.toISOString(),
                ends_at: endsAt ? endsAt.toISOString() : null,
                service_description: form.service_description || null,
                deposit: Number(form.deposit) || 0,
                estimated_total: Number(form.estimated_total) || 0,
                notes: form.notes || null,
            });
            setShowNew(false);
            setCustomer(null);
            setForm({ artist_id: "", time: "12:00", duration: "60", service_description: "", deposit: "", estimated_total: "", notes: "" });
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not create the appointment");
        } finally {
            setSaving(false);
        }
    };

    const setStatus = async (a: Appointment, status: string) => {
        setError(null);
        try {
            await api.updateAppointment(a.id, { status });
            setSelected(null);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not update");
        }
    };

    const complete = async (a: Appointment, total: number, paymentMode: string) => {
        setError(null);
        try {
            await api.updateAppointment(a.id, {
                status: "completed",
                total,
                payment_mode: paymentMode,
            });
            setSelected(null);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not complete this appointment");
        }
    };

    const remove = async (a: Appointment) => {
        setError(null);
        try {
            await api.deleteAppointment(a.id);
            setSelected(null);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not remove");
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    // Arrows move by whatever unit is on screen — a day, a week, or a month.
    const step = (n: number) => {
        if (view === "day") return setDay(addDays(day, n));
        if (view === "week") return setDay(addDays(day, n * 7));
        const d = new Date(day);
        d.setMonth(d.getMonth() + n);
        setDay(d);
    };

    const rangeLabel = () => {
        if (view === "day") {
            return day.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
        }
        if (view === "week") {
            const start = addDays(day, -day.getDay());
            const end = addDays(start, 6);
            const sameMonth = start.getMonth() === end.getMonth();
            return `${start.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(
                undefined,
                sameMonth ? { day: "numeric", month: "short" } : { day: "numeric", month: "short" }
            )}`;
        }
        return day.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    };

    const isToday = dayKey(day) === dayKey(new Date());
    const counts = {
        booked: appointments.filter((a) => a.status === "booked").length,
        confirmed: appointments.filter((a) => a.status === "confirmed").length,
        completed: appointments.filter((a) => a.status === "completed").length,
    };

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-60 p-6 md:p-10">
                <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Appointments</h1>
                        <p className="text-sm text-[var(--muted)] mt-1">
                            {counts.booked} booked · {counts.confirmed} confirmed · {counts.completed} completed
                            {role && OWN_RECORDS_ONLY.includes(role) && " · your bookings only"}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNew((v) => !v)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded neo-btn text-sm"
                    >
                        <Plus className="w-4 h-4" /> New appointment
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <button onClick={() => step(-1)} className="p-2 neo-btn rounded">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-[220px] text-center">
                        <div className="font-display text-xl">{rangeLabel()}</div>
                        {isToday && <div className="text-[10px] uppercase tracking-widest text-[var(--primary)]">Today</div>}
                    </div>
                    <button onClick={() => step(1)} className="p-2 neo-btn rounded">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDay(new Date())} className="px-3 py-2 text-xs neo-btn rounded">Today</button>
                    <button onClick={() => setDay(addDays(new Date(), 1))} className="px-3 py-2 text-xs neo-btn rounded">Tomorrow</button>
                    <input
                        type="date"
                        value={dayKey(day)}
                        onChange={(e) => e.target.value && setDay(new Date(`${e.target.value}T12:00:00`))}
                        className="px-3 py-2 neo-input text-sm [color-scheme:dark]"
                    />

                    <div className="flex rounded overflow-hidden border border-[var(--border-color)] ml-auto">
                        {(["day", "week", "month"] as CalendarView[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-2 text-xs capitalize transition-colors ${
                                    view === v
                                        ? "bg-[var(--primary)] text-ink"
                                        : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                                }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-3 rounded border border-[var(--danger)] text-[var(--danger)] text-sm">
                        {error}
                    </div>
                )}

                {showNew && (
                    <div className="mb-6 p-5 rounded border border-[var(--border-color)] bg-[var(--surface)]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Customer</label>
                                <CustomerSearch selected={customer} onSelect={setCustomer} />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Time</label>
                                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                                    className="w-full px-3 py-2 neo-input text-sm [color-scheme:dark]" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Duration</label>
                                <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                                    className="w-full px-3 py-2 neo-input text-sm">
                                    <option value="30">30 min</option>
                                    <option value="60">1 hour</option>
                                    <option value="120">2 hours</option>
                                    <option value="180">3 hours</option>
                                    <option value="240">4 hours</option>
                                    <option value="360">6 hours</option>
                                    <option value="0">Open ended</option>
                                </select>
                            </div>
                            {!(role && OWN_RECORDS_ONLY.includes(role)) && (
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Artist</label>
                                    <select value={form.artist_id} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}
                                        className="w-full px-3 py-2 neo-input text-sm">
                                        <option value="">Unassigned</option>
                                        {artists.filter((a) => a.is_active).map((a) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Service</label>
                                <input value={form.service_description} onChange={(e) => setForm({ ...form, service_description: e.target.value })}
                                    placeholder="e.g. Tattoo — forearm linework" className="w-full px-3 py-2 neo-input text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Deposit (₹)</label>
                                <input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                                    className="w-full px-3 py-2 neo-input text-sm" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Expected total (₹)</label>
                                <input type="number" value={form.estimated_total} onChange={(e) => setForm({ ...form, estimated_total: e.target.value })}
                                    className="w-full px-3 py-2 neo-input text-sm" placeholder="0" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Notes</label>
                                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-3 py-2 neo-input text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={create} disabled={saving || !customer}
                                className="px-4 py-2 rounded neo-btn text-sm disabled:opacity-40">
                                {saving ? "Saving…" : "Book appointment"}
                            </button>
                            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-[var(--muted)]">Cancel</button>
                            {!customer && (
                                // The button is disabled until a customer row is picked, and a
                                // disabled button that says nothing reads as a broken one.
                                <span className="self-center text-[11px] text-[var(--muted)]">
                                    Pick a customer above to enable this
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 mb-3 text-[11px] text-[var(--muted)] flex-wrap">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm border border-[var(--primary)]" /> Booked
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-[var(--primary)]" /> Confirmed
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-[var(--surface-hover)] border border-[var(--border-color)]" /> Completed
                    </span>
                </div>

                {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                ) : (
                    <AppointmentCalendar
                        appointments={appointments}
                        view={view}
                        anchor={day}
                        onSelect={setSelected}
                        onPickDay={(d) => { setDay(d); setView("day"); }}
                    />
                )}

                {selected && (
                    <AppointmentDetail
                        appointment={selected}
                        onClose={() => setSelected(null)}
                        onStatus={setStatus}
                        onComplete={complete}
                        onDelete={remove}
                    />
                )}
            </main>
        </div>
    );
}

function AppointmentDetail({
    appointment: a,
    onClose,
    onStatus,
    onComplete,
    onDelete,
}: {
    appointment: Appointment;
    onClose: () => void;
    onStatus: (a: Appointment, s: string) => void;
    onComplete: (a: Appointment, total: number, mode: string) => void;
    onDelete: (a: Appointment) => void;
}) {
    const [total, setTotal] = useState(String(a.estimated_total || ""));
    const [mode, setMode] = useState("upi");
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded border border-[var(--border-color)] bg-[var(--surface)] p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="font-display text-2xl">{a.customers?.name ?? "Customer"}</h2>
                        <p className="text-sm text-[var(--muted)]">
                            {new Date(a.starts_at).toLocaleString(undefined, {
                                weekday: "short", day: "numeric", month: "short",
                                hour: "numeric", minute: "2-digit",
                            })}
                            {a.artists?.name ? ` · ${a.artists.name}` : " · Unassigned"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 text-[var(--muted)]"><X className="w-5 h-5" /></button>
                </div>

                <dl className="text-sm space-y-1 mb-5">
                    {a.customers?.phone && (
                        <div className="flex justify-between"><dt className="text-[var(--muted)]">Phone</dt><dd>{a.customers.phone}</dd></div>
                    )}
                    {a.service_description && (
                        <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Service</dt><dd className="text-right">{a.service_description}</dd></div>
                    )}
                    <div className="flex justify-between"><dt className="text-[var(--muted)]">Deposit</dt><dd>{formatCurrency(a.deposit)}</dd></div>
                    <div className="flex justify-between"><dt className="text-[var(--muted)]">Status</dt><dd className="capitalize">{a.status.replace("_", " ")}</dd></div>
                    {a.notes && (
                        <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Notes</dt><dd className="text-right">{a.notes}</dd></div>
                    )}
                </dl>

                {a.status === "completed" ? (
                    <p className="text-sm text-[var(--accent)]">
                        Completed — this created an order, so it already counts towards revenue.
                    </p>
                ) : (
                    <>
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {a.status !== "confirmed" && (
                                <button onClick={() => onStatus(a, "confirmed")} className="px-3 py-2 text-sm neo-btn rounded">
                                    <Check className="w-4 h-4 inline mr-1" /> Confirm
                                </button>
                            )}
                            {a.status !== "booked" && (
                                <button onClick={() => onStatus(a, "booked")} className="px-3 py-2 text-sm neo-btn rounded">
                                    Back to booked
                                </button>
                            )}
                            <button onClick={() => onStatus(a, "no_show")} className="px-3 py-2 text-sm neo-btn rounded">
                                No show
                            </button>
                        </div>

                        <div className="border-t border-[var(--border-color)] pt-4">
                            <p className="text-xs text-[var(--muted)] mb-2">
                                Marking this complete creates an order for the amount below — that is
                                what puts it on the Orders tab and into revenue.
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <input type="number" value={total} onChange={(e) => setTotal(e.target.value)}
                                    placeholder="Amount charged" className="flex-1 min-w-[120px] px-3 py-2 neo-input text-sm" />
                                <select value={mode} onChange={(e) => setMode(e.target.value)} className="px-3 py-2 neo-input text-sm">
                                    <option value="upi">UPI</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                </select>
                                <button
                                    onClick={() => onComplete(a, Number(total) || 0, mode)}
                                    disabled={!total}
                                    className="px-4 py-2 text-sm neo-btn rounded disabled:opacity-40"
                                >
                                    Mark completed
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <div className="border-t border-[var(--border-color)] mt-5 pt-4">
                    {confirmDelete ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[var(--danger)]">Remove this appointment?</span>
                            <button onClick={() => onDelete(a)} className="px-3 py-1.5 text-xs rounded bg-[var(--danger)] text-white">
                                Yes, remove
                            </button>
                            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-[var(--muted)]">
                                Keep it
                            </button>
                            <span className="w-full text-[11px] text-[var(--muted)]">
                                Kept in the studio&rsquo;s history — it just stops appearing here.
                            </span>
                        </div>
                    ) : (
                        <button onClick={() => setConfirmDelete(true)} className="text-sm text-[var(--danger)] flex items-center gap-1.5">
                            <Trash2 className="w-4 h-4" /> Remove appointment
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


/**
 * Single-customer search for booking.
 *
 * CustomerPicker is a multi-select built for campaigns (a Set of ids), so it does
 * not fit here. This queries the server on each search rather than pulling all
 * 1,397 customers into the page just to pick one.
 */
function CustomerSearch({
    selected,
    onSelect,
}: {
    selected: Customer | null;
    onSelect: (c: Customer | null) => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Customer[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (selected || query.trim().length < 2) {
            setResults([]);
            return;
        }
        // Debounced: typing a name should not fire a request per keystroke.
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.getCustomers({ search: query.trim(), limit: 20 });
                setResults(res.customers.slice(0, 8));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query, selected]);

    if (selected) {
        return (
            <div className="flex items-center gap-3 px-3 py-2 neo-input text-sm">
                <span className="flex-1">
                    {selected.name}
                    {selected.phone ? <span className="text-[var(--muted)]"> · {selected.phone}</span> : null}
                </span>
                <button onClick={() => { onSelect(null); setQuery(""); }} className="text-[var(--muted)]">
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, phone or Instagram…"
                className="w-full px-3 py-2 neo-input text-sm"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-2.5 text-[var(--muted)]" />}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]">
                    No customer matches “{query.trim()}”. Try just the first name or the phone number.
                </div>
            )}
            {results.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded border border-[var(--border-color)] bg-[var(--surface)] max-h-60 overflow-y-auto">
                    {results.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => { onSelect(c); setQuery(""); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-hover)]"
                        >
                            {c.name}
                            {c.phone ? <span className="text-[var(--muted)]"> · {c.phone}</span> : null}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
