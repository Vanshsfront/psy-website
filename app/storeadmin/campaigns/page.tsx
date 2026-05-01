"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import TemplatesTab from "@/components/storeadmin/TemplatesTab";
import TemplateViewModal from "@/components/storeadmin/TemplateViewModal";
import CampaignHistoryTab from "@/components/storeadmin/CampaignHistoryTab";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import type { WhatsAppTemplate, Customer } from "@/types/storeadmin";
import {
    Send,
    MessageSquare,
    Filter,
    Eye,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertTriangle,
    ArrowRight,
    Sparkles,
    LayoutTemplate,
    Eye as EyeIcon,
    History as HistoryIcon,
} from "lucide-react";

function renderPlaceholders(text: string, customer: Customer | undefined): string {
    const fullName = (customer?.name ?? "").trim();
    const firstName = fullName.split(/\s+/)[0] || "Customer";
    const phone = customer?.phone ?? "";
    const instagram = customer?.instagram ?? "";
    return text
        .replace(/\{\{(\d+)\}\}/g, (_, n) => {
            const idx = parseInt(n, 10);
            if (idx === 1) return firstName;
            if (idx === 2) return phone;
            if (idx === 3) return instagram;
            return "";
        })
        .replace(/\{\{([a-zA-Z_]\w*)\}\}/g, (_, name) => {
            switch (name.toLowerCase()) {
                case "name":
                case "customer_name":
                case "first_name":
                    return firstName;
                case "full_name":
                    return fullName || "Customer";
                case "phone":
                    return phone;
                case "instagram":
                case "ig":
                    return instagram;
                case "studio":
                    return "PSY Tattoos";
                default:
                    return "";
            }
        });
}

function CampaignsContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [tab, setTab] = useState<"send" | "templates" | "history">("send");
    const [cooldownDays, setCooldownDays] = useState<number>(14);
    const [autoExclude, setAutoExclude] = useState<boolean>(true);
    const [recentRecipients, setRecentRecipients] = useState<Record<string, { last_sent_at: string; template_name: string }>>({});
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
    const [filterText, setFilterText] = useState("");
    const [matchedCustomers, setMatchedCustomers] = useState<Customer[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterError, setFilterError] = useState("");
    const [filterSuggestion, setFilterSuggestion] = useState("");
    const [inferenceCaution, setInferenceCaution] = useState("");
    const [inferredFields, setInferredFields] = useState<Array<{ field: string; source: string }>>([]);
    const [sendResults, setSendResults] = useState<Array<{ customer_name: string; success: boolean; error?: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [isRestored, setIsRestored] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);

    useEffect(() => {
        const saved = sessionStorage.getItem("psy_campaigns_state");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.step) setStep(parsed.step);
                if (parsed.filterText) setFilterText(parsed.filterText);
                if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate);
                if (parsed.matchedCustomers) setMatchedCustomers(parsed.matchedCustomers);
                if (parsed.selectedIds) setSelectedIds(new Set(parsed.selectedIds));
            } catch (err) {
                console.error("Failed to restore campaigns state", err);
            }
        }
        setIsRestored(true);
    }, []);

    useEffect(() => {
        if (!isRestored) return;
        const stateToSave = {
            step,
            filterText,
            selectedTemplate,
            matchedCustomers,
            selectedIds: Array.from(selectedIds),
        };
        sessionStorage.setItem("psy_campaigns_state", JSON.stringify(stateToSave));
    }, [isRestored, step, filterText, selectedTemplate, matchedCustomers, selectedIds]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) loadTemplates();
    }, [isAuthenticated]);

    const loadTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const res = await api.getTemplates();
            setTemplates(res.templates || []);
        } catch {
            console.error("Failed to load templates");
        } finally {
            setTemplatesLoading(false);
        }
    };

    const handleFilter = async () => {
        if (!filterText.trim()) return;
        setLoading(true);
        setFilterError("");
        setFilterSuggestion("");
        setInferenceCaution("");
        setInferredFields([]);
        try {
            const res = await api.filterCampaign(filterText);
            if (res.success) {
                setMatchedCustomers(res.customers);

                // Pull recent recipients of this template within cooldown window so we can
                // auto-exclude / badge them.
                let recents: Record<string, { last_sent_at: string; template_name: string }> = {};
                if (selectedTemplate) {
                    try {
                        const r = await api.getRecentRecipients(selectedTemplate.name, cooldownDays);
                        recents = r.recipients;
                    } catch {
                        // non-fatal
                    }
                }
                setRecentRecipients(recents);

                const valid = res.customers.filter((c: Customer) => (c.phone ?? "").trim().length > 0);
                const initialSelection = autoExclude
                    ? valid.filter((c: Customer) => !recents[c.id])
                    : valid;
                setSelectedIds(new Set(initialSelection.map((c: Customer) => c.id)));
                if (res.inference_caution) setInferenceCaution(res.inference_caution);
                if (res.inferred_fields) setInferredFields(res.inferred_fields);
                setStep(3);
            } else {
                setFilterError(res.error || "Filter failed");
                setFilterSuggestion(res.suggestion || "");
            }
        } catch (err) {
            setFilterError("Failed to process filter");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!selectedTemplate || selectedIds.size === 0) return;
        setLoading(true);
        try {
            const res = await api.sendCampaign({
                template_name: selectedTemplate.name,
                customer_ids: Array.from(selectedIds),
                nl_filter_text: filterText,
            });
            setSendResults(res.results);
            setStep(4);
        } catch {
            console.error("Send failed");
        } finally {
            setLoading(false);
        }
    };

    const toggleCustomer = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10">
                <div className="max-w-4xl mx-auto">
                    <h1 className="font-display text-4xl font-bold mb-2">WhatsApp Campaigns</h1>
                    <p className="text-[var(--muted)] mb-6">Send template messages to filtered customer segments</p>

                    {/* Tab switcher */}
                    <div className="flex gap-2 mb-8 border-b border-[var(--border-color)]">
                        {[
                            { key: "send" as const, label: "Send Campaign", icon: Send },
                            { key: "templates" as const, label: "Templates", icon: LayoutTemplate },
                            { key: "history" as const, label: "History", icon: HistoryIcon },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTab(key)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                                    tab === key
                                        ? "border-[var(--primary)] text-[var(--primary)]"
                                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === "templates" && <TemplatesTab />}

                    {tab === "history" && <CampaignHistoryTab />}

                    {tab === "send" && (
                    <>
                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mb-8">
                        {[
                            { num: 1, label: "Template" },
                            { num: 2, label: "Filter" },
                            { num: 3, label: "Preview" },
                            { num: 4, label: "Results" },
                        ].map(({ num, label }) => (
                            <div key={num} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= num
                                    ? "bg-[var(--primary)] text-[#0A0A0A]"
                                    : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border-color)]"
                                    }`}>
                                    {num}
                                </div>
                                <span className={`text-sm ${step >= num ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                                    {label}
                                </span>
                                {num < 4 && <div className={`w-8 h-px ${step > num ? "bg-[var(--primary)]" : "bg-[var(--border-color)]"}`} />}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Select Template */}
                    {step === 1 && (
                        <div className="glass-panel p-6 animate-fadeIn">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-[var(--primary)]" />
                                Select Template
                            </h3>
                            {templatesLoading ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--primary)]" />
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[var(--muted)] opacity-30" />
                                    <p className="text-[var(--muted)]">No approved templates found</p>
                                    <p className="text-xs text-[var(--muted)] mt-2">Configure WhatsApp Business API credentials or create templates in Meta Business Manager</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {templates.map((t) => (
                                        <div
                                            key={t.name}
                                            className={`group flex items-stretch rounded border transition-all overflow-hidden ${
                                                selectedTemplate?.name === t.name
                                                    ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                                                    : "border-[var(--border-color)] bg-[var(--surface-hover)] hover:border-[var(--primary)]/50"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setPreviewTemplate(t)}
                                                title="View template details"
                                                className="px-3 flex items-center gap-1 text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors border-r border-[var(--border-color)] cursor-pointer"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                <span className="text-xs hidden sm:inline">View</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedTemplate(t); setStep(2); }}
                                                className="flex-1 p-4 text-left cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{t.name}</p>
                                                        <p className="text-xs text-[var(--muted)]">{t.category} · {t.language}</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-[var(--muted)] shrink-0 ml-3" />
                                                </div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {templates.length === 0 && (
                                <button
                                    onClick={() => { setSelectedTemplate({ name: "demo_template", language: "en", category: "MARKETING", components: [{ type: "BODY", text: "Hi {{1}}, check out our latest offers!" }] }); setStep(2); }}
                                    className="mt-4 w-full py-3 bg-[var(--surface-hover)] text-[var(--foreground)] rounded text-sm font-medium"
                                >
                                    Use Demo Template →
                                </button>
                            )}
                        </div>
                    )}

                    {/* Step 2: Write NL Filter */}
                    {step === 2 && (
                        <div className="glass-panel p-6 animate-fadeIn">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-[var(--accent)]" />
                                Filter Customers
                            </h3>
                            <p className="text-sm text-[var(--muted)] mb-4">
                                Describe your target audience in natural language. AI will find matching customers.
                            </p>

                            <div className="relative">
                                <textarea
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    placeholder='e.g. "All customers who spent more than 10k last month"'
                                    className="w-full px-4 py-3 neo-input text-sm resize-none"
                                    rows={3}
                                />
                            </div>

                            {/* Cooldown controls */}
                            <div className="mt-4 p-3 rounded bg-[var(--surface-hover)] border border-[var(--border-color)] space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoExclude}
                                        onChange={(e) => setAutoExclude(e.target.checked)}
                                        className="w-4 h-4 accent-[var(--primary)]"
                                    />
                                    <span className="text-sm font-medium">Auto-exclude recently messaged</span>
                                </label>
                                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                                    <span>Skip anyone who got</span>
                                    <span className="font-mono">{selectedTemplate?.name || "this template"}</span>
                                    <span>in the last</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={cooldownDays}
                                        onChange={(e) => setCooldownDays(Math.max(1, Number(e.target.value) || 1))}
                                        disabled={!autoExclude}
                                        className="w-16 px-2 py-1 neo-input text-xs disabled:opacity-50"
                                    />
                                    <span>days</span>
                                </div>
                            </div>

                            {filterError && (
                                <div className="mt-4 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded">
                                    <div className="flex items-center gap-2 text-[var(--danger)] mb-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm font-medium">Filter Error</span>
                                    </div>
                                    <p className="text-sm text-[var(--muted)]">{filterError}</p>
                                    {filterSuggestion && (
                                        <p className="text-sm text-[var(--accent)] mt-2">Suggestion: {filterSuggestion}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setStep(1)} className="px-6 py-2.5 neo-btn text-sm">Back</button>
                                <button onClick={handleFilter} disabled={!filterText.trim() || loading} className="flex-1 py-2.5 neo-btn neo-btn-primary text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Filter className="w-4 h-4" /> Find Customers</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview & Confirm */}
                    {step === 3 && (
                        <div className="glass-panel p-6 animate-fadeIn">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-[var(--primary)]" />
                                    Preview — {matchedCustomers.length} customers matched
                                </h3>
                                <span className="text-sm text-[var(--muted)]">
                                    {selectedIds.size} selected
                                </span>
                            </div>

                            {inferenceCaution && (
                                <div className="mb-4 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
                                        <div>
                                            <span className="text-sm font-medium text-[var(--warning)]">AI Inference Used</span>
                                            <p className="text-sm text-[var(--muted)] mt-1">{inferenceCaution}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const invalidCount = matchedCustomers.filter((c) => !(c.phone ?? "").trim()).length;
                                return invalidCount > 0 ? (
                                    <div className="mb-4 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" />
                                            <p className="text-sm text-[var(--muted)]">
                                                {invalidCount} customer{invalidCount === 1 ? "" : "s"} excluded — no phone number on file
                                            </p>
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            <div className="max-h-[400px] overflow-y-auto space-y-2 mb-6">
                                {matchedCustomers.map((c) => {
                                    const hasPhone = (c.phone ?? "").trim().length > 0;
                                    const recent = recentRecipients[c.id];
                                    return (
                                        <label
                                            key={c.id}
                                            className={`flex items-center gap-3 p-3 rounded bg-[var(--surface-hover)] transition-colors ${
                                                hasPhone
                                                    ? "hover:bg-[var(--border-color)]/30 cursor-pointer"
                                                    : "opacity-60 cursor-not-allowed"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={hasPhone && selectedIds.has(c.id)}
                                                disabled={!hasPhone}
                                                onChange={() => hasPhone && toggleCustomer(c.id)}
                                                className="w-4 h-4 accent-[var(--primary)] disabled:cursor-not-allowed"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-medium">{c.name}</p>
                                                    {!hasPhone && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--danger)]/20 text-[var(--danger)] font-medium">
                                                            No phone
                                                        </span>
                                                    )}
                                                    {recent && (
                                                        <span
                                                            title={`Last messaged on ${new Date(recent.last_sent_at).toLocaleDateString()}`}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--warning)]/20 text-[var(--warning)] font-medium"
                                                        >
                                                            Already messaged
                                                        </span>
                                                    )}
                                                    {(c as any)._inferred_gender && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--warning)]/20 text-[var(--warning)] font-medium">
                                                            {(c as any)._inferred_gender} (inferred)
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[var(--muted)]">
                                                    {c.phone || "—"} · Spent {formatCurrency(c.lifetime_spend || 0)}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            {selectedTemplate && (
                                <div className="p-4 bg-[var(--background)] rounded border border-[var(--border-color)] mb-6">
                                    <p className="text-xs text-[var(--muted)] mb-2">Template Preview</p>
                                    {selectedTemplate.components.map((comp, idx) => {
                                        const previewCustomer = matchedCustomers.find((c) => (c.phone ?? "").trim()) ?? matchedCustomers[0];
                                        if (comp.type === "HEADER" && comp.text) {
                                            return <p key={idx} className="text-sm font-bold mb-1">{renderPlaceholders(comp.text, previewCustomer)}</p>;
                                        }
                                        if (comp.type === "BODY" && comp.text) {
                                            return <p key={idx} className="text-sm whitespace-pre-line">{renderPlaceholders(comp.text, previewCustomer)}</p>;
                                        }
                                        if (comp.type === "FOOTER" && comp.text) {
                                            return <p key={idx} className="text-xs text-[var(--muted)] mt-2 italic">{comp.text}</p>;
                                        }
                                        return null;
                                    })}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setStep(2)} className="px-6 py-2.5 neo-btn text-sm">Back</button>
                                <button onClick={handleSend} disabled={selectedIds.size === 0 || loading} className="flex-1 py-2.5 neo-btn neo-btn-primary text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send to {selectedIds.size} customers</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {step === 4 && (
                        <div className="glass-panel p-6 animate-fadeIn">
                            <h3 className="text-lg font-semibold mb-4">Campaign Results</h3>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-[var(--primary)]/10 rounded text-center">
                                    <p className="text-2xl font-bold text-[var(--primary)]">{sendResults.filter((r) => r.success).length}</p>
                                    <p className="text-sm text-[var(--muted)]">Sent</p>
                                </div>
                                <div className="p-4 bg-[var(--danger)]/10 rounded text-center">
                                    <p className="text-2xl font-bold text-[var(--danger)]">{sendResults.filter((r) => !r.success).length}</p>
                                    <p className="text-sm text-[var(--muted)]">Failed</p>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {sendResults.map((r, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded ${r.success ? "bg-[var(--primary)]/5" : "bg-[var(--danger)]/5"}`}>
                                        <div className="flex items-center gap-2">
                                            {r.success ? <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" /> : <XCircle className="w-4 h-4 text-[var(--danger)]" />}
                                            <span className="text-sm">{r.customer_name}</span>
                                        </div>
                                        {r.error && <span className="text-xs text-[var(--danger)]">{r.error}</span>}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => { setStep(1); setSelectedIds(new Set()); setMatchedCustomers([]); setSendResults([]); setFilterText(""); }} className="w-full mt-6 py-3 neo-btn neo-btn-primary text-sm font-medium">
                                New Campaign
                            </button>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </main>

            <TemplateViewModal
                open={previewTemplate !== null}
                template={previewTemplate}
                onClose={() => setPreviewTemplate(null)}
            />
        </div>
    );
}

export default function CampaignsPage() {
    return <CampaignsContent />;
}
