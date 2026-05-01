"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import { api } from "@/lib/storeadmin/api";
import type { Campaign, MessageLog } from "@/types/storeadmin";

type CampaignWithStats = Campaign & { sent_count: number; failed_count: number };
type LogWithCustomer = MessageLog & {
    customers?: { name: string; phone: string | null; instagram: string | null } | null;
};

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function CampaignHistoryTab() {
    const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<{
        campaign: Campaign;
        logs: LogWithCustomer[];
    } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadList = async () => {
        setLoading(true);
        try {
            const res = await api.listCampaigns();
            setCampaigns(res.campaigns as CampaignWithStats[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadList();
    }, []);

    useEffect(() => {
        if (!selectedId) {
            setDetail(null);
            return;
        }
        let cancelled = false;
        setDetailLoading(true);
        (async () => {
            try {
                const res = await api.getCampaign(selectedId);
                if (!cancelled) setDetail(res as typeof detail);
            } catch (e) {
                console.error(e);
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    if (selectedId && detail) {
        const { campaign, logs } = detail;
        const sent = logs.filter((l) => l.status === "sent").length;
        const failed = logs.filter((l) => l.status !== "sent").length;
        return (
            <div className="animate-fadeIn space-y-4">
                <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1.5"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to all campaigns
                </button>

                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                        <div>
                            <h3 className="font-semibold text-lg">{campaign.template_name}</h3>
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Sent {formatDateTime(campaign.created_at)}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-[var(--primary)]">
                                <CheckCircle2 className="w-4 h-4" /> {sent}
                            </span>
                            <span className="flex items-center gap-1 text-[var(--danger)]">
                                <XCircle className="w-4 h-4" /> {failed}
                            </span>
                            <span className="text-[var(--muted)]">· {logs.length} total</span>
                        </div>
                    </div>
                    {campaign.nl_filter_text && (
                        <p className="text-xs text-[var(--muted)] italic mb-2">
                            Filter: {campaign.nl_filter_text}
                        </p>
                    )}
                </div>

                <div className="glass-panel p-4">
                    <h4 className="text-sm font-semibold mb-3">Recipients</h4>
                    {logs.length === 0 ? (
                        <p className="text-sm text-[var(--muted)] py-6 text-center">No recipients</p>
                    ) : (
                        <div className="space-y-1 max-h-[500px] overflow-y-auto">
                            {logs.map((l) => (
                                <div
                                    key={l.id}
                                    className={`flex items-center justify-between gap-3 p-2.5 rounded text-sm ${
                                        l.status === "sent"
                                            ? "bg-[var(--primary)]/5"
                                            : "bg-[var(--danger)]/5"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {l.status === "sent" ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <span className="truncate block">
                                                {l.customers?.name || "Unknown"}
                                            </span>
                                            {l.phone && (
                                                <span className="text-xs text-[var(--muted)] block">
                                                    {l.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end text-right shrink-0">
                                        <span className="text-xs text-[var(--muted)]">
                                            {formatDateTime(l.sent_at)}
                                        </span>
                                        {l.error_message && (
                                            <span className="text-[10px] text-[var(--danger)] mt-0.5">
                                                {l.error_message}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">All campaigns</h3>
                    <p className="text-xs text-[var(--muted)]">
                        {campaigns.length} sent · click any to view recipients
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadList}
                    disabled={loading}
                    className="px-3 py-2 neo-btn text-xs font-medium flex items-center gap-2 disabled:opacity-40"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {loading || detailLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="glass-panel p-8 text-center text-sm text-[var(--muted)]">
                    No campaigns sent yet.
                </div>
            ) : (
                <div className="space-y-2">
                    {campaigns.map((c) => {
                        const total = c.sent_count + c.failed_count;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedId(c.id)}
                                className="w-full flex items-center justify-between gap-4 p-4 rounded border border-[var(--border-color)] bg-[var(--surface-hover)] hover:border-[var(--primary)]/50 transition-colors text-left cursor-pointer"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{c.template_name}</p>
                                    <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        {formatDateTime(c.created_at)}
                                        {c.nl_filter_text && (
                                            <>
                                                <span>·</span>
                                                <span className="truncate italic">
                                                    {c.nl_filter_text}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-sm">
                                    <span className="flex items-center gap-1 text-[var(--primary)]">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> {c.sent_count}
                                    </span>
                                    {c.failed_count > 0 && (
                                        <span className="flex items-center gap-1 text-[var(--danger)]">
                                            <XCircle className="w-3.5 h-3.5" /> {c.failed_count}
                                        </span>
                                    )}
                                    <span className="text-[var(--muted)] text-xs">/ {total}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
