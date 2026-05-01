"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, X } from "lucide-react";

type InlineCellType = "text" | "number" | "date" | "select" | "checkbox";

export interface InlineCellProps {
    type: InlineCellType;
    value: string | number | boolean | null;
    onSave: (next: string | number | boolean | null) => Promise<void> | void;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    display?: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

/**
 * Click-to-edit cell. Saves on blur (text/number/date/select) or change (checkbox).
 * Stops click propagation so the row doesn't trigger its own onClick.
 */
export default function InlineCell({
    type,
    value,
    onSave,
    options,
    placeholder,
    display,
    className,
    disabled,
}: InlineCellProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<string>(toStr(value));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            if (inputRef.current instanceof HTMLInputElement && type !== "checkbox") {
                inputRef.current.select?.();
            }
        }
    }, [editing, type]);

    useEffect(() => {
        setDraft(toStr(value));
    }, [value]);

    const commit = async (next: string | number | boolean | null) => {
        setSaving(true);
        setError(null);
        try {
            await onSave(next);
            setEditing(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleBlur = async () => {
        if (type === "checkbox") return;
        const original = toStr(value);
        if (draft === original) {
            setEditing(false);
            return;
        }
        const next: string | number | null =
            type === "number" ? (draft === "" ? 0 : Number(draft)) : draft || null;
        await commit(next);
    };

    if (type === "checkbox") {
        return (
            <label
                className={`inline-flex items-center cursor-pointer ${className || ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                <input
                    type="checkbox"
                    checked={!!value}
                    disabled={disabled || saving}
                    onChange={(e) => commit(e.target.checked)}
                    className="w-4 h-4 accent-[var(--primary)]"
                />
                {saving && <Loader2 className="w-3 h-3 animate-spin text-[var(--muted)] ml-2" />}
            </label>
        );
    }

    if (!editing) {
        return (
            <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) setEditing(true);
                }}
                className={`text-left w-full px-2 py-1 -mx-2 -my-1 rounded hover:bg-[var(--primary)]/10 transition-colors cursor-text ${
                    disabled ? "cursor-not-allowed opacity-60" : ""
                } ${className || ""}`}
                title={disabled ? "Read-only" : "Click to edit"}
            >
                {display ?? (toStr(value) || <span className="text-[var(--muted)]">—</span>)}
            </button>
        );
    }

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            {type === "select" && options ? (
                <select
                    ref={(el) => { inputRef.current = el; }}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={handleBlur}
                    disabled={saving}
                    className="w-full px-2 py-1 neo-input text-sm"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    ref={(el) => { inputRef.current = el; }}
                    type={type}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                        } else if (e.key === "Escape") {
                            setDraft(toStr(value));
                            setEditing(false);
                        }
                    }}
                    placeholder={placeholder}
                    disabled={saving}
                    className="w-full px-2 py-1 neo-input text-sm"
                />
            )}
            {saving && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                </span>
            )}
            {error && (
                <div className="absolute z-10 left-0 right-0 mt-1 px-2 py-1 rounded bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[10px] text-[var(--danger)] flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {error}
                </div>
            )}
        </div>
    );
}

function toStr(v: string | number | boolean | null | undefined): string {
    if (v === null || v === undefined) return "";
    return String(v);
}
