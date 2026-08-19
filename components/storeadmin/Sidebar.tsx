"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Users,
    PlusCircle,
    Send,
    DollarSign,
    LogOut,
    Menu,
    X,
    ClipboardList,
    Palette,
    Wallet,
    ShieldCheck,
    CalendarDays,
    Scale,
} from "lucide-react";
import { canOpen } from "@/lib/auth/permissions";
import { NAV_SECTIONS } from "@/lib/auth/navigation";


export default function Sidebar() {
    const pathname = usePathname();
    const { logout, username, role } = useAuth();
    // Render nothing until the role is known. This previously fell open with
    // `!role || ...`, so on every page load each user saw the full nav for a
    // moment before it narrowed to theirs.
    // A section with no reachable items is dropped rather than left as a bare
    // heading, so an artist does not see an empty "Shop" label.
    const sections = role
        ? NAV_SECTIONS
              .map((s) => ({ ...s, items: s.items.filter((i) => canOpen(role, i.href)) }))
              .filter((s) => s.items.length > 0)
        : [];
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    // Exact match for the section roots and for anything that is a prefix of a
    // sibling, so /storeadmin/orders does not light up while on
    // /storeadmin/orders/new, and the two Dashboards do not both look active.
    const EXACT = new Set(["/storeadmin", "/admin", "/storeadmin/orders", "/storeadmin/orders/new"]);
    const isActive = (href: string) => (EXACT.has(href) ? pathname === href : pathname.startsWith(href));

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-40 w-10 h-10 rounded neo-btn flex items-center justify-center md:hidden"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5 text-[var(--foreground)]" />
            </button>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 bottom-0 left-0 w-60 bg-[var(--surface)] border-r border-[var(--border-color)] flex flex-col z-50 transition-transform duration-300 ease-out md:translate-x-0 ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                }`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                    <Link href="/storeadmin">
                        <span className="font-display tracking-widest text-2xl text-[var(--foreground)]">
                            PSY ADMIN
                        </span>
                    </Link>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overscroll-contain">
                    {sections.map((section) => (
                        <div key={section.title} className="space-y-1">
                            <p className="px-4 pb-1 text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]/70">
                                {section.title}
                            </p>
                            {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-colors relative ${
                                    active
                                        ? "bg-[var(--surface-hover)] text-[var(--primary)] border-l-2 border-[var(--primary)]"
                                        : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-white"
                                }`}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="tracking-wide">{item.label}</span>
                            </Link>
                        );
                            })}
                        </div>
                    ))}
                </nav>

                {/* User + Sign Out */}
                <div className="p-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-3 text-sm text-[var(--muted)] mb-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center font-bold text-white uppercase text-xs">
                            {username?.[0] || "A"}
                        </div>
                        <span className="truncate">{username}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-sm text-[var(--danger)] hover:text-[#ff6b6b] transition-colors w-full text-left font-medium cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
