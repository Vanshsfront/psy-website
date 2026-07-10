"use client";

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

export type ExpenseFieldValues = {
    amount: number;
    category: string;
    description: string;
    vendor: string;
    payment_mode: string;
    date: string;
    raw_input: string;
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
    };
}

// Mirrors the server-side rules in parseExpenseResponse (amount > 0, valid
// category, YYYY-MM-DD date). Returns an error string or null.
export function validateExpenseFields(v: ExpenseFieldValues): string | null {
    if (!v.amount || v.amount <= 0) return "Amount must be greater than 0";
    if (!EXPENSE_CATEGORIES.includes(v.category as (typeof EXPENSE_CATEGORIES)[number]))
        return "Pick a valid category";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return "Date must be YYYY-MM-DD";
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
        </div>
    );
}
