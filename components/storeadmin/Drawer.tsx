"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    widthClass?: string;
    footer?: React.ReactNode;
}

export default function Drawer({
    open,
    onClose,
    title,
    children,
    widthClass = "w-full sm:max-w-xl",
    footer,
}: DrawerProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;
        previouslyFocused.current = document.activeElement as HTMLElement | null;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.key !== "Tab" || !panelRef.current) return;
            const focusables = panelRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const firstField = panelRef.current?.querySelector<HTMLElement>(
            'input, textarea, select, button:not([data-drawer-close])'
        );
        firstField?.focus();

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
            previouslyFocused.current?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                className={`relative ${widthClass} h-full bg-[var(--background)] border-l border-[var(--border-color)] shadow-2xl flex flex-col animate-slideInRight`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                    <div className="text-base font-semibold truncate">{title}</div>
                    <button
                        data-drawer-close
                        onClick={onClose}
                        className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && (
                    <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--surface)]/60">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
