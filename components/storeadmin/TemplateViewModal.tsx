"use client";

import { X, Hash, MessageSquare, Image as ImageIcon, Type, ExternalLink } from "lucide-react";
import type { WhatsAppTemplate, TemplateWithStatus } from "@/types/storeadmin";

interface TemplateViewModalProps {
    template: WhatsAppTemplate | TemplateWithStatus | null;
    open: boolean;
    onClose: () => void;
}

function statusBadgeClasses(status?: string): string {
    switch (status) {
        case "APPROVED":
            return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
        case "PENDING":
        case "IN_APPEAL":
            return "bg-amber-500/15 text-amber-400 border-amber-500/30";
        case "REJECTED":
            return "bg-red-500/15 text-red-400 border-red-500/30";
        case "PAUSED":
        case "DISABLED":
            return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
        default:
            return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    }
}

function extractVariables(text: string): string[] {
    const set = new Set<string>();
    const re = /\{\{([^}]+)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) set.add(m[1].trim());
    return Array.from(set);
}

export default function TemplateViewModal({ template, open, onClose }: TemplateViewModalProps) {
    if (!open || !template) return null;

    const status = (template as TemplateWithStatus).status;
    const rejectedReason = (template as TemplateWithStatus).rejected_reason;

    const headerComp = template.components.find((c) => c.type === "HEADER");
    const bodyComp = template.components.find((c) => c.type === "BODY");
    const footerComp = template.components.find((c) => c.type === "FOOTER");
    const buttonsComp = template.components.find((c) => c.type === "BUTTONS");

    const allVariables = [
        ...extractVariables(headerComp?.text ?? ""),
        ...extractVariables(bodyComp?.text ?? ""),
    ];
    const uniqueVariables = Array.from(new Set(allVariables));

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--background)] border border-[var(--border-color)] rounded-lg shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 bg-[var(--background)] border-b border-[var(--border-color)]">
                    <div className="min-w-0">
                        <h2 className="font-semibold text-lg truncate">{template.name}</h2>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)]">
                            <span>{template.category}</span>
                            <span>·</span>
                            <span>{template.language}</span>
                            {status && (
                                <>
                                    <span>·</span>
                                    <span
                                        className={`px-2 py-0.5 rounded border text-[10px] font-medium ${statusBadgeClasses(
                                            status
                                        )}`}
                                    >
                                        {status}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {rejectedReason && rejectedReason !== "NONE" && (
                        <div className="p-3 rounded bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-sm text-[var(--danger)]">
                            <span className="font-semibold">Rejection reason:</span> {rejectedReason}
                        </div>
                    )}

                    {/* WhatsApp-style preview */}
                    <div className="bg-[#0b141a] rounded p-4 border border-[var(--border-color)]">
                        <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
                            Preview
                        </p>
                        <div className="bg-[#005c4b] text-white rounded-lg p-3 ml-auto max-w-[85%] shadow">
                            {headerComp?.text && (
                                <p className="font-bold text-sm mb-1.5">{headerComp.text}</p>
                            )}
                            {headerComp?.format === "IMAGE" && (
                                <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
                                    <ImageIcon className="w-3.5 h-3.5" /> Image header
                                </div>
                            )}
                            {bodyComp?.text && (
                                <p className="text-sm whitespace-pre-line">{bodyComp.text}</p>
                            )}
                            {footerComp?.text && (
                                <p className="text-xs italic opacity-70 mt-2">{footerComp.text}</p>
                            )}
                            {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/15 space-y-1.5">
                                    {buttonsComp.buttons.map((b, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-center gap-1.5 text-xs text-[#7CC8FF] font-medium"
                                        >
                                            {b.url && <ExternalLink className="w-3 h-3" />}
                                            <span>{b.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Components breakdown */}
                    <div className="space-y-3">
                        {headerComp?.text && (
                            <Section icon={<Type className="w-3.5 h-3.5" />} label="Header">
                                <p className="text-sm">{headerComp.text}</p>
                            </Section>
                        )}
                        {bodyComp?.text && (
                            <Section icon={<MessageSquare className="w-3.5 h-3.5" />} label="Body">
                                <p className="text-sm whitespace-pre-line">{bodyComp.text}</p>
                            </Section>
                        )}
                        {footerComp?.text && (
                            <Section icon={<Type className="w-3.5 h-3.5" />} label="Footer">
                                <p className="text-sm">{footerComp.text}</p>
                            </Section>
                        )}
                        {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                            <Section icon={<ExternalLink className="w-3.5 h-3.5" />} label="Buttons">
                                <div className="space-y-1.5">
                                    {buttonsComp.buttons.map((b, idx) => (
                                        <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="font-medium">{b.text}</span>
                                            <span className="text-xs text-[var(--muted)]">
                                                {b.type}
                                                {b.url ? ` → ${b.url}` : b.phone_number ? ` → ${b.phone_number}` : ""}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                        {uniqueVariables.length > 0 && (
                            <Section icon={<Hash className="w-3.5 h-3.5" />} label={`Variables (${uniqueVariables.length})`}>
                                <div className="flex flex-wrap gap-1.5">
                                    {uniqueVariables.map((v) => (
                                        <span
                                            key={v}
                                            className="px-2 py-0.5 rounded bg-[var(--surface-hover)] text-xs font-mono"
                                        >
                                            {`{{${v}}}`}
                                        </span>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1.5">
                {icon}
                <span>{label}</span>
            </div>
            <div className="px-3 py-2 rounded bg-[var(--surface-hover)] border border-[var(--border-color)]">
                {children}
            </div>
        </div>
    );
}
