"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import Drawer from "./Drawer";
import { api } from "@/lib/storeadmin/api";
import { formatDate } from "@/lib/storeadmin/utils";
import type { Order, Artist } from "@/types/storeadmin";

interface OrderEditDrawerProps {
    open: boolean;
    orderId: string | null;
    onClose: () => void;
    onSaved?: (order: Order | null) => void;
}

interface FormState {
    order_date: string;
    artist_id: string;
    service_description: string;
    payment_mode: string;
    source: string;
    deposit: string;
    total: string;
    tracking_number: string;
    courier_name: string;
    discount_code: string;
    discount_amount: string;
    comments: string;
    admin_notes: string;
    consent_signed: boolean;
}

const EMPTY_FORM: FormState = {
    order_date: "",
    artist_id: "",
    service_description: "",
    payment_mode: "",
    source: "",
    deposit: "",
    total: "",
    tracking_number: "",
    courier_name: "",
    discount_code: "",
    discount_amount: "",
    comments: "",
    admin_notes: "",
    consent_signed: false,
};

function orderToForm(o: Order): FormState {
    return {
        order_date: o.order_date ? o.order_date.split("T")[0] : "",
        artist_id: o.artist_id || "",
        service_description: o.service_description || "",
        payment_mode: o.payment_mode ? o.payment_mode.toLowerCase() : "",
        source: o.source || "",
        deposit: o.deposit != null ? String(o.deposit) : "",
        total: o.total != null ? String(o.total) : "",
        tracking_number: o.tracking_number || "",
        courier_name: o.courier_name || "",
        discount_code: o.discount_code || "",
        discount_amount: o.discount_amount != null ? String(o.discount_amount) : "",
        comments: o.comments || "",
        admin_notes: o.admin_notes || "",
        consent_signed: !!o.consent_signed,
    };
}

function buildPatch(original: FormState, current: FormState): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    const numericKeys = new Set(["deposit", "total", "discount_amount"]);
    const nullableEmptyKeys = new Set([
        "artist_id",
        "service_description",
        "payment_mode",
        "source",
        "tracking_number",
        "courier_name",
        "discount_code",
        "comments",
        "admin_notes",
    ]);

    (Object.keys(current) as (keyof FormState)[]).forEach((k) => {
        if (current[k] === original[k]) return;
        const v = current[k];
        if (numericKeys.has(k)) {
            patch[k] = v === "" ? 0 : Number(v);
        } else if (nullableEmptyKeys.has(k)) {
            patch[k] = v === "" ? null : v;
        } else {
            patch[k] = v;
        }
    });
    return patch;
}

export default function OrderEditDrawer({
    open,
    orderId,
    onClose,
    onSaved,
}: OrderEditDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [original, setOriginal] = useState<FormState>(EMPTY_FORM);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    useEffect(() => {
        if (!open || !orderId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setConfirmDelete(false);
        (async () => {
            try {
                const [orderData, artistsRes] = await Promise.all([
                    api.getOrder(orderId),
                    api.getArtists(),
                ]);
                if (cancelled) return;
                setOrder(orderData);
                setArtists(artistsRes.artists);
                const f = orderToForm(orderData);
                setOriginal(f);
                setForm(f);
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : "Failed to load order");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, orderId]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!orderId) return;
        const dep = Number(form.deposit || 0);
        const tot = Number(form.total || 0);
        if (!Number.isNaN(dep) && !Number.isNaN(tot) && dep > tot) {
            setError("Deposit cannot exceed total.");
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
            const res = await api.updateOrder(orderId, patch);
            onSaved?.(res.order);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!orderId) return;
        setDeleting(true);
        setError(null);
        try {
            await api.deleteOrder(orderId);
            onSaved?.(null);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

    const title = order
        ? `Edit Order ${order.order_number ? `· ${order.order_number}` : ""}`
        : "Edit Order";

    const footer = (
        <div className="flex items-center gap-3">
            {!confirmDelete ? (
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
                    <span>Delete permanently?</span>
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
                {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <Save className="w-3.5 h-3.5" />
                )}
                Save
            </button>
        </div>
    );

    return (
        <Drawer open={open} onClose={onClose} title={title} footer={footer} widthClass="w-full sm:max-w-2xl">
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
            ) : !order ? (
                <div className="text-center text-sm text-[var(--muted)] py-10">
                    {error || "Order not found."}
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted)]">
                        <div>
                            <div className="uppercase tracking-wider text-[10px] mb-0.5">Customer</div>
                            <div className="text-sm text-[var(--foreground)]">
                                {order.customers?.name || "—"}
                            </div>
                        </div>
                        <div>
                            <div className="uppercase tracking-wider text-[10px] mb-0.5">Created</div>
                            <div className="text-sm text-[var(--foreground)]">
                                {order.created_at ? formatDate(order.created_at) : "—"}
                            </div>
                        </div>
                        {order.updated_at && (
                            <div>
                                <div className="uppercase tracking-wider text-[10px] mb-0.5">Last updated</div>
                                <div className="text-sm text-[var(--foreground)]">
                                    {formatDate(order.updated_at)}
                                </div>
                            </div>
                        )}
                        {order.order_number && (
                            <div>
                                <div className="uppercase tracking-wider text-[10px] mb-0.5">Order #</div>
                                <div className="text-sm text-[var(--foreground)]">{order.order_number}</div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date">
                            <input
                                type="date"
                                value={form.order_date}
                                onChange={(e) => update("order_date", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm [color-scheme:dark]"
                            />
                        </Field>
                        <Field label="Artist">
                            <select
                                value={form.artist_id}
                                onChange={(e) => update("artist_id", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            >
                                <option value="">— none —</option>
                                {artists.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Payment mode">
                            <select
                                value={form.payment_mode}
                                onChange={(e) => update("payment_mode", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            >
                                <option value="">—</option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="other">Other</option>
                            </select>
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

                        <Field label="Deposit (₹)">
                            <input
                                type="number"
                                min="0"
                                value={form.deposit}
                                onChange={(e) => update("deposit", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                                placeholder="0"
                            />
                        </Field>
                        <Field label="Total (₹)">
                            <input
                                type="number"
                                min="0"
                                value={form.total}
                                onChange={(e) => update("total", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                                placeholder="0"
                            />
                        </Field>

                        <Field label="Tracking #">
                            <input
                                value={form.tracking_number}
                                onChange={(e) => update("tracking_number", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            />
                        </Field>
                        <Field label="Courier">
                            <input
                                value={form.courier_name}
                                onChange={(e) => update("courier_name", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            />
                        </Field>

                        <Field label="Discount code">
                            <input
                                value={form.discount_code}
                                onChange={(e) => update("discount_code", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                            />
                        </Field>
                        <Field label="Discount amount (₹)">
                            <input
                                type="number"
                                min="0"
                                value={form.discount_amount}
                                onChange={(e) => update("discount_amount", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                                placeholder="0"
                            />
                        </Field>

                        <Field label="Service description" colSpan>
                            <input
                                value={form.service_description}
                                onChange={(e) => update("service_description", e.target.value)}
                                className="w-full px-3 py-2 neo-input text-sm"
                                placeholder="e.g. Full sleeve, geometric"
                            />
                        </Field>

                        <Field label="Comments" colSpan>
                            <textarea
                                value={form.comments}
                                onChange={(e) => update("comments", e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 neo-input text-sm resize-none"
                            />
                        </Field>
                        <Field label="Admin notes" colSpan>
                            <textarea
                                value={form.admin_notes}
                                onChange={(e) => update("admin_notes", e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 neo-input text-sm resize-none"
                                placeholder="Internal only"
                            />
                        </Field>

                        <div className="col-span-2">
                            <label className="flex items-start gap-3 p-3 rounded border border-[var(--border-color)] bg-[var(--surface-hover)] cursor-pointer hover:border-[var(--primary)]/40 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={form.consent_signed}
                                    onChange={(e) => update("consent_signed", e.target.checked)}
                                    className="mt-0.5 w-4 h-4 accent-[var(--primary)]"
                                />
                                <span className="text-sm">
                                    <span className="font-medium">Consent form signed</span>
                                    <span className="block text-xs text-[var(--muted)] mt-0.5">
                                        Aftercare, waivers, photo release.{" "}
                                        <a
                                            href="/consent"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[var(--primary)] hover:underline"
                                        >
                                            View form &rarr;
                                        </a>
                                    </span>
                                </span>
                            </label>
                        </div>
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
