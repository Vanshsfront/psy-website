"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

// Shared, editable expense field set. Used in two places on the expenses page:
//  - AI mode: pre-filled with the AI-parsed result so the user can override any
//    field before saving.
//  - Manual mode: empty/default values for direct entry without the AI.
// Both paths submit the same shape to api.confirmExpense (POST /expenses/confirm).

export const EXPENSE_CATEGORIES = [
    "supplies", "rent", "utilities", "equipment",
    "marketing", "salary", "maintenance", "other",
] as const;

export const PAYMENT_MODES = [
    "cash", "card", "UPI", "bank_transfer", "other",
] as const;

// Petty = paid out of the studio float, business = a company expense. The studio
// tracked these in two separate WhatsApp groups before this field existed.
export const EXPENSE_TYPES = ["business", "petty"] as const;

export type ExpenseFieldValues = {
    amount: number;
    category: string;
    description: string;
    vendor: string;
    payment_mode: string;
    date: string;
    raw_input: string;
    expense_type: string;
    /** Photo of the bill; replaces keeping receipts in the WhatsApp group. */
    receipt_url: string | null;
};

export function emptyExpenseFields(): ExpenseFieldValues {
    return {
        amount: 0,
        category: "other",
        description: "",
        vendor: "UNKNOWN",
        payment_mode: "cash",
        date: new Date().toISOString().split("T")[0],
        raw_input: "",
        expense_type: "business",
        receipt_url: null,
    };
}

// Mirrors the server-side rules in parseExpenseResponse (amount > 0, valid
// category, YYYY-MM-DD date). Returns an error string or null.
export function validateExpenseFields(v: ExpenseFieldValues): string | null {
    if (!v.amount || v.amount <= 0) return "Amount must be greater than 0";
    if (!EXPENSE_CATEGORIES.includes(v.category as (typeof EXPENSE_CATEGORIES)[number]))
        return "Pick a valid category";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return "Date must be YYYY-MM-DD";
    // Mirrors the expenses_expense_type_check constraint, so a bad value is
    // caught here rather than as a database error on save.
    if (!EXPENSE_TYPES.includes(v.expense_type as (typeof EXPENSE_TYPES)[number]))
        return "Pick petty or business";
    return null;
}

type Props = {
    values: ExpenseFieldValues;
    onChange: (next: ExpenseFieldValues) => void;
    disabled?: boolean;
};

export default function ExpenseFields({ values, onChange, disabled }: Props) {
    const set = <K extends keyof ExpenseFieldValues>(key: K, val: ExpenseFieldValues[K]) =>
        onChange({ ...values, [key]: val });

    const labelCls = "text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1 block";

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
                <label className={labelCls}>Amount (₹)</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.amount || ""}
                    onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-full px-3 py-2 neo-input text-sm"
                    placeholder="0"
                />
            </div>

            <div>
                <label className={labelCls}>Category</label>
                <select
                    value={values.category}
                    onChange={(e) => set("category", e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 neo-input text-sm capitalize"
                >
                    {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className={labelCls}>Payment Mode</label>
                <select
                    value={values.payment_mode}
                    onChange={(e) => set("payment_mode", e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 neo-input text-sm"
                >
                    {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            </div>

            <div className="col-span-2">
                <label className={labelCls}>Description</label>
                <input
                    value={values.description}
                    onChange={(e) => set("description", e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 neo-input text-sm"
                    placeholder="e.g. tattoo inks restock"
                />
            </div>

            <div>
                <label className={labelCls}>Vendor</label>
                <input
                    value={values.vendor}
                    onChange={(e) => set("vendor", e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 neo-input text-sm"
                    placeholder="UNKNOWN"
                />
            </div>

            <div>
                <label className={labelCls}>Date</label>
                <input
                    type="date"
                    value={values.date}
                    onChange={(e) => set("date", e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 neo-input text-sm"
                />
            </div>

            <div>
                <label className={labelCls}>Type</label>
                <select
                    value={values.expense_type}
                    onChange={(e) => set("expense_type", e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 neo-input text-sm capitalize"
                >
                    {EXPENSE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            <div className="col-span-2 md:col-span-3">
                <label className={labelCls}>Bill / Receipt</label>
                <ReceiptUpload
                    url={values.receipt_url}
                    disabled={disabled}
                    onChange={(url) => set("receipt_url", url)}
                />
            </div>
        </div>
    );
}

/**
 * Attaches a photo of the bill to an expense.
 *
 * Uploads straight to the `guest-applications` bucket, which is the one already
 * configured to accept anonymous inserts — /storeadmin authenticates with its
 * own JWT, not a Supabase session, so a bucket requiring an authenticated
 * Supabase role would reject these uploads.
 */
function ReceiptUpload({
    url,
    disabled,
    onChange,
}: {
    url: string | null;
    disabled?: boolean;
    onChange: (url: string | null) => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        setError(null);
        try {
            const supabase = createClient();
            const ext = file.name.split(".").pop() || "jpg";
            const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from("guest-applications")
                .upload(path, file, { upsert: false, contentType: file.type });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from("guest-applications").getPublicUrl(path);
            onChange(data.publicUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="flex items-center gap-3">
            {url ? (
                <>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--primary)] underline"
                    >
                        View receipt
                    </a>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        disabled={disabled}
                        className="text-xs text-[var(--danger)]"
                    >
                        Remove
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled || busy}
                    className="px-3 py-1.5 text-xs neo-btn rounded disabled:opacity-50"
                >
                    {busy ? "Uploading…" : "Attach bill"}
                </button>
            )}
            {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={handle}
                className="hidden"
            />
        </div>
    );
}
