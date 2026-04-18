"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatRelativeDate } from "@/lib/storeadmin/utils";
import type { Customer } from "@/types/storeadmin";

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSelect: (customer: Customer) => void;
    onClear?: () => void;
    placeholder?: string;
    inputClassName?: string;
    required?: boolean;
    disabled?: boolean;
}

export default function CustomerAutofill({
    value,
    onChange,
    onSelect,
    onClear,
    placeholder,
    inputClassName,
    required,
    disabled,
}: Props) {
    const [results, setResults] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null);
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const justSelectedRef = useRef(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (justSelectedRef.current) {
            justSelectedRef.current = false;
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = value.trim();
        if (q.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await api.getCustomers({ search: q, limit: 8 });
                setResults(res.customers ?? []);
                setHighlight(0);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [value]);

    const updateCoords = useCallback(() => {
        if (!inputRef.current) return;
        const r = inputRef.current.getBoundingClientRect();
        setCoords({ left: r.left, top: r.bottom + 4, width: r.width });
    }, []);

    useEffect(() => {
        if (!open) return;
        updateCoords();
        window.addEventListener("scroll", updateCoords, true);
        window.addEventListener("resize", updateCoords);
        return () => {
            window.removeEventListener("scroll", updateCoords, true);
            window.removeEventListener("resize", updateCoords);
        };
    }, [open, updateCoords]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (inputRef.current?.contains(e.target as Node)) return;
            if (dropdownRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const pick = (c: Customer) => {
        justSelectedRef.current = true;
        onSelect(c);
        setOpen(false);
        setResults([]);
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            setOpen(false);
            return;
        }
        if (!open || results.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(results.length - 1, h + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
        } else if (e.key === "Enter") {
            if (results[highlight]) {
                e.preventDefault();
                pick(results[highlight]);
            }
        }
    };

    const showDropdown =
        mounted && open && coords && (loading || results.length > 0 || value.trim().length >= 2);

    return (
        <>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    onClear?.();
                    setOpen(true);
                }}
                onFocus={() => {
                    if (value.trim().length >= 2) setOpen(true);
                }}
                onKeyDown={onKey}
                placeholder={placeholder}
                className={inputClassName}
                required={required}
                disabled={disabled}
                autoComplete="off"
            />
            {showDropdown &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: "fixed",
                            left: coords!.left,
                            top: coords!.top,
                            width: Math.max(coords!.width, 320),
                            zIndex: 9999,
                        }}
                        className="glass-panel shadow-2xl max-h-80 overflow-y-auto rounded border border-[var(--border-color)]"
                    >
                        {loading && (
                            <div className="px-3 py-2 text-xs text-[var(--muted)]">Searching…</div>
                        )}
                        {!loading &&
                            results.length === 0 &&
                            value.trim().length >= 2 && (
                                <div className="px-3 py-2 text-xs text-[var(--muted)]">
                                    No matches — will create a new customer on save
                                </div>
                            )}
                        {!loading &&
                            results.map((c, i) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onMouseEnter={() => setHighlight(i)}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        pick(c);
                                    }}
                                    className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-b-0 ${
                                        i === highlight
                                            ? "bg-[var(--primary-muted)]"
                                            : "hover:bg-[var(--surface-hover)]"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium truncate">{c.name}</span>
                                        <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">
                                            {c.visit_count ?? 0}v · {formatCurrency(c.lifetime_spend ?? 0)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-[var(--muted)] truncate">
                                        {c.phone || "—"}
                                        {c.instagram ? ` · @${c.instagram}` : ""}
                                        {c.last_visit_date ? ` · last ${formatRelativeDate(c.last_visit_date)}` : ""}
                                    </div>
                                </button>
                            ))}
                    </div>,
                    document.body
                )}
        </>
    );
}
