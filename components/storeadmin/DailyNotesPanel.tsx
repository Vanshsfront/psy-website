"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquarePlus, Trash2, StickyNote } from "lucide-react";
import { api } from "@/lib/storeadmin/api";
import type { DailyNote } from "@/types/storeadmin";

interface DailyNotesPanelProps {
    dateFrom?: string;
    dateTo?: string;
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function formatNoteDate(d: string): string {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function DailyNotesPanel({ dateFrom, dateTo }: DailyNotesPanelProps) {
    const [notes, setNotes] = useState<DailyNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [draftDate, setDraftDate] = useState<string>(todayISO());
    const [draftBody, setDraftBody] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.getDailyNotes(dateFrom, dateTo);
            setNotes(res.notes);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo]);

    const grouped = useMemo(() => {
        const map = new Map<string, DailyNote[]>();
        for (const n of notes) {
            if (!map.has(n.note_date)) map.set(n.note_date, []);
            map.get(n.note_date)!.push(n);
        }
        return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [notes]);

    const handleSubmit = async () => {
        const body = draftBody.trim();
        if (!body) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await api.createDailyNote({ note_date: draftDate, body });
            setNotes((prev) => [res.note, ...prev]);
            setDraftBody("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to add note");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this note?")) return;
        setDeletingId(id);
        try {
            await api.deleteDailyNote(id);
            setNotes((prev) => prev.filter((n) => n.id !== id));
        } catch (e) {
            console.error(e);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="glass-panel p-5 animate-fadeIn">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Daily Tally Notes
            </h3>

            {/* Composer */}
            <div className="space-y-2 mb-5 p-3 rounded bg-[var(--surface-hover)] border border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={draftDate}
                        max={todayISO()}
                        onChange={(e) => setDraftDate(e.target.value)}
                        className="px-3 py-2 neo-input text-sm"
                    />
                    <span className="text-xs text-[var(--muted)]">Tally for this date</span>
                </div>
                <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder='e.g. "Counted ₹14,200 cash. Short ₹300 on Y’s session — recheck."'
                    rows={2}
                    className="w-full px-3 py-2 neo-input text-sm resize-none"
                />
                {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !draftBody.trim()}
                        className="px-3 py-2 neo-btn neo-btn-primary text-xs font-medium flex items-center gap-2 disabled:opacity-40"
                    >
                        {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                        )}
                        Add note
                    </button>
                </div>
            </div>

            {/* Feed */}
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                </div>
            ) : grouped.length === 0 ? (
                <p className="text-sm text-[var(--muted)] text-center py-6">
                    No notes yet for this period.
                </p>
            ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {grouped.map(([date, items]) => (
                        <div key={date}>
                            <div className="sticky top-0 bg-[var(--background)] py-1 mb-2 text-xs font-semibold text-[var(--accent)]">
                                {formatNoteDate(date)}
                            </div>
                            <div className="space-y-2">
                                {items.map((n) => (
                                    <div
                                        key={n.id}
                                        className="group flex items-start gap-2 p-3 rounded bg-[var(--surface-hover)] border border-[var(--border-color)]"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm whitespace-pre-wrap break-words">{n.body}</p>
                                            <p className="text-[10px] text-[var(--muted)] mt-1">
                                                {n.author ? `${n.author} · ` : ""}
                                                {formatTime(n.created_at)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(n.id)}
                                            disabled={deletingId === n.id}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all disabled:opacity-40"
                                            aria-label="Delete note"
                                        >
                                            {deletingId === n.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
