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
} from "lucide-react";
import type { UserRole } from "@/components/storeadmin/AuthProvider";

const allNavItems = [
    { label: "Dashboard", href: "/storeadmin", icon: LayoutDashboard, roles: ["admin", "superadmin"] as UserRole[] },
    { label: "Customers", href: "/storeadmin/customers", icon: Users, roles: ["admin", "superadmin"] as UserRole[] },
    { label: "Orders", href: "/storeadmin/orders", icon: ClipboardList, roles: ["admin", "superadmin"] as UserRole[] },
    { label: "New Order", href: "/storeadmin/orders/new", icon: PlusCircle, roles: ["admin", "superadmin"] as UserRole[] },
    { label: "Artists", href: "/storeadmin/artists", icon: Palette, roles: ["admin", "superadmin"] as UserRole[] },
    { label: "Campaigns", href: "/storeadmin/campaigns", icon: Send, roles: ["admin", "superadmin"] as UserRole[] },
    { label: "Finance", href: "/storeadmin/finance", icon: DollarSign, roles: ["superadmin"] as UserRole[] },
    { label: "Petty Cash", href: "/storeadmin/expenses", icon: Wallet, roles: ["admin", "superadmin"] as UserRole[] },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, username, role } = useAuth();
    const navItems = allNavItems.filter(item => !role || item.roles.includes(role));
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

    const isActive = (href: string) => {
        if (href === "/storeadmin") return pathname === "/storeadmin";
        if (href === "/storeadmin/orders/new") return pathname === "/storeadmin/orders/new";
        if (href === "/storeadmin/orders") return pathname === "/storeadmin/orders";
        return pathname.startsWith(href);
    };

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
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
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
