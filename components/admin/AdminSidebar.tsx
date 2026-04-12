"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

interface AdminSidebarProps {
  userName: string;
  signOutAction: () => Promise<void>;
}

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Portfolio", href: "/admin/portfolio", icon: ImageIcon },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Bookings", href: "/admin/bookings", icon: Calendar },
  { label: "Artists", href: "/admin/artists", icon: Users },
  { label: "Community", href: "/admin/community", icon: Megaphone },
  { label: "Guest Spots", href: "/admin/guest-spots", icon: UserPlus },
  { label: "Testimonials", href: "/admin/testimonials", icon: Star },
  { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { label: "Collections", href: "/admin/collections", icon: FolderOpen },
  { label: "Categories", href: "/admin/categories", icon: Layers },
  { label: "Discounts", href: "/admin/discounts", icon: Tag },
  { label: "Customers", href: "/admin/customers", icon: Contact },
  { label: "Returns", href: "/admin/returns", icon: RotateCcw },
  { label: "Site Settings", href: "/admin/site-settings", icon: Settings },
];

export default function AdminSidebar({
  userName,
  signOutAction,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-full md:w-60 shrink-0 bg-surface border-b md:border-b-0 md:border-r border-borderDark flex flex-col md:fixed md:top-0 md:left-0 md:h-screen md:z-40">
      {/* Logo */}
      <div className="p-6 border-b border-borderDark">
        <span className="font-display tracking-widest text-2xl text-primaryText">
          PSY ADMIN
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
        {navItems.map((item) => {
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
