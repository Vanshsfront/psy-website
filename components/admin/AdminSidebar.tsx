"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { NAV_SECTIONS } from "@/lib/auth/navigation";
import { canOpen, type UserRole } from "@/lib/auth/permissions";
import {
  LayoutDashboard,
  Package,
  Image as ImageIcon,
  ShoppingBag,
  Calendar,
  Users,
  LogOut,
  ExternalLink,
  Megaphone,
  UserPlus,
  Star,
  RotateCcw,
  Contact,
  Warehouse,
  Tag,
  FolderOpen,
  Settings,
  Layers,
  BookOpen,
  Inbox,
  Menu,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  userName: string;
  role: UserRole;
  signOutAction: () => Promise<void>;
}


export default function AdminSidebar({
  userName,
  role,
  signOutAction,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // The same sections and the same access rules the Studio panel renders, so
  // whichever half you are in you can see and reach the other.
  const sections = NAV_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => canOpen(role, i.href)) }))
    .filter((s) => s.items.length > 0);

  const EXACT = new Set(["/admin", "/storeadmin", "/storeadmin/orders", "/storeadmin/orders/new"]);
  const isActive = (href: string) => (EXACT.has(href) ? pathname === href : pathname.startsWith(href));

  // On a phone this used to render as a full-width block above the page: all
  // thirty-odd links stacked, so reaching any actual screen meant scrolling
  // past the entire menu first. It is a drawer now, matching the studio panel.
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Stop the page behind the drawer scrolling with it.
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Sits above the content on mobile only; the desktop layout is unchanged. */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 w-10 h-10 rounded bg-surface border border-borderDark flex items-center justify-center md:hidden"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-primaryText" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

    <aside
      className={`fixed top-0 bottom-0 left-0 w-60 shrink-0 bg-surface border-r border-borderDark flex flex-col z-50 transition-transform duration-300 ease-out md:z-40 md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-borderDark flex items-center justify-between">
        <span className="font-display tracking-widest text-2xl text-primaryText">
          PSY ADMIN
        </span>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded text-mutedText hover:text-primaryText transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overscroll-contain">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-4 pb-1 text-[10px] uppercase tracking-[0.15em] text-mutedText/70">
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
                  ? "bg-surfaceLighter text-neon-green border-l-2 border-neon-green"
                  : "text-mutedText hover:bg-surfaceLighter hover:text-white"
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

      {/* View Shop Button */}
      <div className="px-4 py-3 border-t border-borderDark flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2 bg-psy-green/10 hover:bg-psy-green/20 border border-psy-green/30 text-psy-green text-sm font-medium rounded transition-colors"
        >
          <ExternalLink className="w-5 h-5 shrink-0" />
          <span className="tracking-wide">View Shop</span>
        </Link>
      </div>

      {/* User + Sign Out */}
      <div className="p-4 border-t border-borderDark">
        <div className="flex items-center gap-3 text-sm text-mutedText mb-3">
          <div className="w-8 h-8 rounded-full bg-borderDark flex items-center justify-center font-bold text-white uppercase text-xs">
            {userName?.[0] || "A"}
          </div>
          <span className="truncate">{userName}</span>
        </div>
        <form action={signOutAction}>
          <button className="flex items-center gap-2 text-sm text-danger hover:text-[#ff6b6b] transition-colors w-full text-left font-medium">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
    </>
  );
}
