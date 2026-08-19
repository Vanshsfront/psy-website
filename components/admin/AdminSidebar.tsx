"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <aside className="w-full md:w-60 shrink-0 bg-surface border-b md:border-b-0 md:border-r border-borderDark flex flex-col md:fixed md:top-0 md:left-0 md:h-screen md:z-40">
      {/* Logo */}
      <div className="p-6 border-b border-borderDark">
        <span className="font-display tracking-widest text-2xl text-primaryText">
          PSY ADMIN
        </span>
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
  );
}
