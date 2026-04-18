"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import Drawer from "./Drawer";
import { api } from "@/lib/storeadmin/api";
import type { Customer } from "@/types/storeadmin";

interface CustomerEditDrawerProps {
    open: boolean;
    customerId: string | null;
    onClose: () => void;
    onSaved?: (customer: Customer | null) => void;
    allowDelete?: boolean;
}

interface FormState {
    name: string;
    phone: string;
    instagram: string;
    email: string;
    source: string;
    notes: string;
}

const EMPTY_FORM: FormState = {
    name: "",
    phone: "",
    instagram: "",
    email: "",
    source: "",
    notes: "",
};

function customerToForm(c: Customer): FormState {
    return {
        name: c.name || "",
        phone: c.phone || "",
        instagram: c.instagram || "",
        email: c.email || "",
        source: c.source || "",
        notes: c.notes || "",
    };
}

function buildPatch(original: FormState, current: FormState): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    const nullableEmptyKeys = new Set(["phone", "instagram", "email", "source", "notes"]);
    (Object.keys(current) as (keyof FormState)[]).forEach((k) => {
        if (current[k] === original[k]) return;
        const v = current[k];
        if (nullableEmptyKeys.has(k)) {
            patch[k] = v === "" ? null : v;
        } else {
            patch[k] = v;
        }
    });
    return patch;
}

export default function CustomerEditDrawer({
    open,
    customerId,
    onClose,
    onSaved,
    allowDelete = true,
}: CustomerEditDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [original, setOriginal] = useState<FormState>(EMPTY_FORM);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    useEffect(() => {
        if (!open || !customerId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setConfirmDelete(false);
        (async () => {
            try {
                const data = await api.getCustomer(customerId);
                if (cancelled) return;
                setCustomer(data);
                const f = customerToForm(data);
                setOriginal(f);
                setForm(f);
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : "Failed to load customer");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, customerId]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!customerId) return;
        if (!form.name.trim()) {
            setError("Name is required.");
            return;
        }
        const patch = buildPatch(original, form);
        if (!Object.keys(patch).length) {
            onClose();
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const res = await api.updateCustomer(customerId, patch);
            onSaved?.(res.customer);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!customerId) return;
        setDeleting(true);
        setError(null);
        try {
            await api.deleteCustomer(customerId);
            onSaved?.(null);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

    const title = customer ? `Edit · ${customer.name}` : "Edit Customer";

    const footer = (
        <div className="flex items-center gap-3">
            {allowDelete && (
                !confirmDelete ? (
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        disabled={loading || saving || deleting}
                        className="flex items-center gap-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10 px-3 py-2 rounded transition-colors cursor-pointer disabled:opacity-40"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-[var(--danger)]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Delete customer and all orders?</span>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-2 py-1 rounded bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 cursor-pointer disabled:opacity-50"
                        >
                            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            disabled={deleting}
                            className="px-2 py-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                )
            )}
            <div className="flex-1" />
            <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="px-4 py-2 neo-btn text-sm text-[var(--muted)] cursor-pointer disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSave}
                disabled={loading || saving || deleting}
                className="flex items-center gap-1.5 px-4 py-2 neo-btn neo-btn-primary text-sm cursor-pointer disabled:opacity-50"
            >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
            </button>
        </div>
    );

    return (
        <Drawer open={open} onClose={onClose} title={title} footer={footer}>
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
            ) : !customer ? (
                <div className="text-center text-sm text-[var(--muted)] py-10">
                    {error || "Customer not found."}
                </div>
            ) : (
                <div className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Name" colSpan>
                            <input
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            />
                        </Field>
                        <Field label="Phone">
                            <input
                                value={form.phone}
                                onChange={(e) => update("phone", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                                placeholder="+91..."
                            />
                        </Field>
                        <Field label="Instagram">
                            <input
                                value={form.instagram}
                                onChange={(e) => update("instagram", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                                placeholder="handle"
                            />
                        </Field>
                        <Field label="Email">
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            />
                        </Field>
                        <Field label="Source">
                            <select
                                value={form.source}
                                onChange={(e) => update("source", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            >
                                <option value="">—</option>
                                <option value="instagram">Instagram</option>
                                <option value="walk-in">Walk-in</option>
                                <option value="referral">Referral</option>
                                <option value="google">Google</option>
                                {form.source &&
                                    !["instagram", "walk-in", "referral", "google"].includes(form.source) && (
                                        <option value={form.source}>{form.source}</option>
                                    )}
                            </select>
                        </Field>
                        <Field label="Notes" colSpan>
                            <textarea
                                value={form.notes}
                                onChange={(e) => update("notes", e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 neo-input text-sm resize-none"
                            />
                        </Field>
                    </div>
                </div>
            )}
        </Drawer>
    );
}

function Field({
    label,
    colSpan = false,
    children,
}: {
    label: string;
    colSpan?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={colSpan ? "col-span-2" : ""}>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">
                {label}
            </label>
            {children}
        </div>
    );
}
