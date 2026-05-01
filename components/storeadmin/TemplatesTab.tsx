"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, Loader2, AlertTriangle } from "lucide-react";
import DataTable, { DataTableColumn } from "./DataTable";
import TemplateCreateDrawer from "./TemplateCreateDrawer";
import TemplateViewModal from "./TemplateViewModal";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import type { TemplateWithStatus } from "@/types/storeadmin";

function extractBody(t: TemplateWithStatus): string {
    const body = t.components.find((c) => c.type === "BODY");
    return body?.text ?? "";
}

function extractButton(t: TemplateWithStatus): string {
    const btns = t.components.find((c) => c.type === "BUTTONS");
    const first = btns?.buttons?.[0];
    return first?.text ?? "";
}

function statusColor(status: string): string {
    switch (status) {
        case "APPROVED":
            return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
        case "PENDING":
        case "IN_APPEAL":
            return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
        case "REJECTED":
            return "bg-red-500/15 text-red-400 border border-red-500/30";
        case "PAUSED":
        case "DISABLED":
            return "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30";
        default:
            return "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30";
    }
}

export default function TemplatesTab() {
    const [rows, setRows] = useState<TemplateWithStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [viewing, setViewing] = useState<TemplateWithStatus | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFetchError("");
        try {
            clearApiCache();
            const res = await api.getAllTemplates();
            if (!res.success) {
                setFetchError(res.error || "Failed to load templates");
                setRows([]);
            } else {
                setRows(res.templates);
            }
        } catch (e) {
            setFetchError(e instanceof Error ? e.message : "Request failed");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (name: string) => {
        if (!window.confirm(`Delete template "${name}"? This removes it from Meta Business Manager.`)) return;
        setDeleting(name);
        try {
            const res = await api.deleteTemplate(name);
            if (!res.success) {
                alert(`Delete failed: ${res.error ?? "unknown error"}`);
                return;
            }
            await load();
        } catch (e) {
            alert(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setDeleting(null);
        }
    };

    const columns: DataTableColumn<TemplateWithStatus>[] = useMemo(
        () => [
            {
                key: "name",
                label: "Name",
                type: "text",
                accessor: (r) => r.name,
                render: (r) => (
                    <div>
                        <p className="font-medium">{r.name}</p>
                        {r.rejected_reason && r.rejected_reason !== "NONE" && (
                            <p className="text-[11px] text-[var(--danger)] mt-0.5">Reason: {r.rejected_reason}</p>
                        )}
                    </div>
                ),
            },
            {
                key: "category",
                label: "Category",
                type: "enum",
                accessor: (r) => r.category,
            },
            {
                key: "language",
                label: "Lang",
                type: "text",
                accessor: (r) => r.language,
                width: "80px",
            },
            {
                key: "status",
                label: "Status",
                type: "enum",
                accessor: (r) => r.status,
                render: (r) => (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColor(r.status)}`}>
                        {r.status}
                    </span>
                ),
            },
            {
                key: "body",
                label: "Body",
                type: "text",
                accessor: (r) => extractBody(r),
                sortable: false,
                filterable: false,
                render: (r) => {
                    const text = extractBody(r);
                    const truncated = text.length > 80 ? text.slice(0, 80) + "…" : text;
                    return <span className="text-[var(--muted)] text-xs">{truncated}</span>;
                },
            },
            {
                key: "button",
                label: "Button",
                type: "text",
                accessor: (r) => extractButton(r),
                sortable: false,
                filterable: false,
                render: (r) => {
                    const btn = extractButton(r);
                    return btn ? (
                        <span className="text-xs">{btn}</span>
                    ) : (
                        <span className="text-[var(--muted)] text-xs">—</span>
                    );
                },
            },
            {
                key: "actions",
                label: "",
                type: "text",
                accessor: () => "",
                sortable: false,
                filterable: false,
                align: "right",
                width: "60px",
                render: (r) => (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(r.name);
                        }}
                        disabled={deleting === r.name}
                        className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-40 cursor-pointer"
                        aria-label={`Delete ${r.name}`}
                    >
                        {deleting === r.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </button>
                ),
            },
        ],
        [deleting],
    );

    return (
        <div className="animate-fadeIn space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="text-lg font-semibold">Your templates</h3>
                    <p className="text-xs text-[var(--muted)]">
                        {rows.length} total · {rows.filter((r) => r.status === "APPROVED").length} approved
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        className="px-3 py-2 neo-btn text-xs font-medium flex items-center gap-2 disabled:opacity-40"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="px-3 py-2 neo-btn neo-btn-primary text-xs font-medium flex items-center gap-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Template
                    </button>
                </div>
            </div>

            {fetchError && (
                <div className="flex items-start gap-2 p-3 rounded bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-sm">
                    <AlertTriangle className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" />
                    <span className="text-[var(--danger)]">{fetchError}</span>
                </div>
            )}

            <DataTable<TemplateWithStatus>
                rows={rows}
                columns={columns}
                rowKey={(r) => r.name}
                pageSize={25}
                storageKey="psy_templates_table"
                onRowClick={(r) => setViewing(r)}
                globalSearch={{
                    placeholder: "Search templates by name or body…",
                    accessor: (r) => `${r.name} ${extractBody(r)}`,
                }}
                loading={loading}
                emptyState={
                    <div className="py-6">
                        <p className="mb-3">No templates yet.</p>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="px-4 py-2 neo-btn neo-btn-primary text-xs font-medium inline-flex items-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" /> Create your first template
                        </button>
                    </div>
                }
            />

            <TemplateCreateDrawer
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={() => load()}
            />

            <TemplateViewModal
                open={viewing !== null}
                template={viewing}
                onClose={() => setViewing(null)}
            />
        </div>
    );
}
