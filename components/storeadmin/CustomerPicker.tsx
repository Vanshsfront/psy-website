"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/storeadmin/utils";
import type { Customer } from "@/types/storeadmin";

interface CustomerPickerProps {
    customers: Customer[];
    loading: boolean;
    /** Currently ticked ids. Controlled by the parent. */
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
    /** Ids already in the campaign — shown, but locked and never selectable. */
    alreadyAdded?: Set<string>;
    /** Cap the rendered list; the studio has thousands of customers. */
    maxVisible?: number;
}

function hasPhone(c: Customer): boolean {
    return (c.phone ?? "").trim().length > 0;
}

export default function CustomerPicker({
    customers,
    loading,
    selected,
    onChange,
    alreadyAdded,
    maxVisible = 200,
}: CustomerPickerProps) {
    const [query, setQuery] = useState("");

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return customers;
        return customers.filter((c) =>
            [c.name, c.phone, c.instagram]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [customers, query]);

    // Only customers with a phone number can receive a WhatsApp template.
    const selectable = useMemo(
        () => matches.filter((c) => hasPhone(c) && !alreadyAdded?.has(c.id)),
        [matches, alreadyAdded]
    );
    const visible = matches.slice(0, maxVisible);
    const hidden = matches.length - visible.length;

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange(next);
    };

    const selectAllShown = () => {
        const next = new Set(selected);
        selectable.forEach((c) => next.add(c.id));
        onChange(next);
    };

    const clearAll = () => onChange(new Set());

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, phone, or Instagram…"
                    className="w-full pl-10 pr-4 py-2.5 neo-input text-sm"
                />
            </div>

            <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--muted)]">
                    {loading
                        ? "Loading customers…"
                        : `${matches.length} customer${matches.length === 1 ? "" : "s"}${query ? " matched" : ""} · ${selected.size} selected`}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={selectAllShown}
                        disabled={loading || selectable.length === 0}
                        className="text-[var(--primary)] hover:opacity-80 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                        Select all {query ? "matching" : ""} ({selectable.length})
                    </button>
                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={selected.size === 0}
                        className="text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                </div>
            ) : visible.length === 0 ? (
                <div className="text-center py-12">
                    <UserPlus className="w-9 h-9 mx-auto mb-3 text-[var(--muted)] opacity-30" />
                    <p className="text-sm text-[var(--muted)]">
                        {query ? "No customers match that search" : "No customers found"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                        {visible.map((c) => {
                            const phoneOk = hasPhone(c);
                            const locked = alreadyAdded?.has(c.id) ?? false;
                            const disabled = !phoneOk || locked;
                            return (
                                <label
                                    key={c.id}
                                    className={`flex items-center gap-3 p-3 rounded bg-[var(--surface-hover)] transition-colors ${
                                        disabled
                                            ? "opacity-60 cursor-not-allowed"
                                            : "hover:bg-[var(--border-color)]/30 cursor-pointer"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={locked || selected.has(c.id)}
                                        disabled={disabled}
                                        onChange={() => !disabled && toggle(c.id)}
                                        className="w-4 h-4 accent-[var(--primary)] disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium truncate">{c.name}</p>
                                            {locked && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] font-medium">
                                                    Already added
                                                </span>
                                            )}
                                            {!phoneOk && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--danger)]/20 text-[var(--danger)] font-medium">
                                                    No phone
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--muted)] truncate">
                                            {c.phone || "—"} · Spent {formatCurrency(c.lifetime_spend || 0)}
                                            {c.visit_count ? ` · ${c.visit_count} visit${c.visit_count === 1 ? "" : "s"}` : ""}
                                        </p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                    {hidden > 0 && (
                        <p className="text-xs text-[var(--muted)] text-center">
                            {hidden} more not shown — narrow the search to reach them.
                            {" "}Select all still covers every match.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
