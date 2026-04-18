"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import Drawer from "./Drawer";
import { api } from "@/lib/storeadmin/api";

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const DEFAULT_EXAMPLE = "Priya";

export default function TemplateCreateDrawer({ open, onClose, onCreated }: Props) {
    const [brief, setBrief] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");

    const [name, setName] = useState("");
    const [category, setCategory] = useState<"MARKETING" | "UTILITY">("MARKETING");
    const [body, setBody] = useState("");
    const [buttonText, setButtonText] = useState("");
    const [buttonUrl, setButtonUrl] = useState("");
    const [example, setExample] = useState(DEFAULT_EXAMPLE);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const reset = () => {
        setBrief("");
        setAiError("");
        setName("");
        setCategory("MARKETING");
        setBody("");
        setButtonText("");
        setButtonUrl("");
        setExample(DEFAULT_EXAMPLE);
        setSubmitError("");
    };

    const handleClose = () => {
        if (submitting) return;
        reset();
        onClose();
    };

    const handleGenerate = async () => {
        if (!brief.trim() || aiLoading) return;
        setAiLoading(true);
        setAiError("");
        try {
            const res = await api.generateTemplate(brief.trim());
            if (!res.success) {
                setAiError(res.error || "AI could not generate a template");
                return;
            }
            if (res.name) setName(res.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
            if (res.category === "UTILITY" || res.category === "MARKETING") setCategory(res.category);
            if (res.body) setBody(res.body);
            if (res.button_text) setButtonText(res.button_text);
            if (res.button_url) setButtonUrl(res.button_url);
        } catch (e) {
            setAiError(e instanceof Error ? e.message : "AI generation failed");
        } finally {
            setAiLoading(false);
        }
    };

    const canSubmit =
        !!name.trim() &&
        /^[a-z0-9_]+$/.test(name.trim()) &&
        !!body.trim() &&
        (!buttonText || (!!buttonUrl && buttonUrl.startsWith("https://"))) &&
        (!buttonUrl || !!buttonText);

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        setSubmitError("");
        setSubmitting(true);
        try {
            const res = await api.createTemplate({
                name: name.trim(),
                category,
                language: "en",
                body: body.trim(),
                button_text: buttonText.trim() || undefined,
                button_url: buttonUrl.trim() || undefined,
                example: example.trim() || DEFAULT_EXAMPLE,
            });
            if (!res.success) {
                setSubmitError(res.error || "Failed to create template");
                return;
            }
            onCreated();
            reset();
            onClose();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : "Request failed");
        } finally {
            setSubmitting(false);
        }
    };

    const previewBody = useMemo(
        () => body.replace(/\{\{1\}\}/g, example || DEFAULT_EXAMPLE),
        [body, example],
    );

    const bodyCount = body.length;

    return (
        <Drawer
            open={open}
            onClose={handleClose}
            title="Create WhatsApp Template"
            widthClass="w-full sm:max-w-2xl"
            footer={
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="px-4 py-2 neo-btn text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className="px-4 py-2 neo-btn neo-btn-primary text-sm font-medium disabled:opacity-40 flex items-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Submit to Meta for review
                    </button>
                </div>
            }
        >
            <div className="space-y-5">
                {/* AI section */}
                <section className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                        <h3 className="text-sm font-semibold">Generate with AI</h3>
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-3">
                        Describe the template in plain English. Gemini will draft the name, category, body, and button.
                    </p>
                    <textarea
                        value={brief}
                        onChange={(e) => setBrief(e.target.value)}
                        placeholder='e.g. "remind lapsed customers to book a tattoo, warm tone, link to /studio"'
                        className="w-full px-3 py-2 neo-input text-sm resize-none"
                        rows={3}
                    />
                    {aiError && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-[var(--danger)]">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{aiError}</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!brief.trim() || aiLoading}
                        className="mt-3 px-3 py-2 neo-btn text-xs font-medium flex items-center gap-2 disabled:opacity-40"
                    >
                        {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {aiLoading ? "Generating…" : "Generate with AI"}
                    </button>
                </section>

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm text-[var(--muted)] mb-1">
                            Name <span className="text-[var(--danger)]">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value.toLowerCase())}
                            placeholder="psy_example_template"
                            className="w-full px-4 py-3 neo-input text-sm font-mono"
                        />
                        <p className="text-[11px] text-[var(--muted)] mt-1">
                            lowercase, underscores only · prefix with <code>psy_</code> · max 40 chars
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as "MARKETING" | "UTILITY")}
                            className="w-full px-4 py-3 neo-input text-sm"
                        >
                            <option value="MARKETING">MARKETING</option>
                            <option value="UTILITY">UTILITY</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">
                            Example name (for <code>{"{{1}}"}</code>)
                        </label>
                        <input
                            value={example}
                            onChange={(e) => setExample(e.target.value)}
                            placeholder={DEFAULT_EXAMPLE}
                            className="w-full px-4 py-3 neo-input text-sm"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm text-[var(--muted)] mb-1">
                            Body <span className="text-[var(--danger)]">*</span>
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Hey {{1}}! ..."
                            className="w-full px-4 py-3 neo-input text-sm resize-none"
                            rows={5}
                        />
                        <p className="text-[11px] text-[var(--muted)] mt-1">
                            Use <code>{"{{1}}"}</code> where the customer's first name should go · {bodyCount}/1024
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Button label</label>
                        <input
                            value={buttonText}
                            onChange={(e) => setButtonText(e.target.value)}
                            placeholder="Book Now"
                            maxLength={25}
                            className="w-full px-4 py-3 neo-input text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--muted)] mb-1">Button URL</label>
                        <input
                            value={buttonUrl}
                            onChange={(e) => setButtonUrl(e.target.value)}
                            placeholder="https://psyonline.in/studio"
                            className="w-full px-4 py-3 neo-input text-sm"
                        />
                    </div>
                </div>

                {/* Live preview */}
                <section>
                    <h3 className="text-sm font-semibold mb-2">Preview</h3>
                    <div className="bg-[#0b141a] rounded-lg p-3 max-w-sm ml-auto">
                        <div className="bg-[#005c4b] text-white text-sm rounded-lg rounded-tr-sm p-3 shadow">
                            <p className="whitespace-pre-line">{previewBody || <span className="opacity-50">Body preview will appear here…</span>}</p>
                            {buttonText && buttonUrl && (
                                <div className="mt-2 pt-2 border-t border-white/15">
                                    <a
                                        href={buttonUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 text-[#53bdeb] text-sm"
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        {buttonText}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {submitError && (
                    <div className="flex items-start gap-2 p-3 rounded bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-sm">
                        <AlertTriangle className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" />
                        <span className="text-[var(--danger)]">{submitError}</span>
                    </div>
                )}
            </div>
        </Drawer>
    );
}
