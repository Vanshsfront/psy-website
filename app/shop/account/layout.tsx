"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useCustomerStore } from "@/store/customerStore";
import { LogOut, Package, MapPin, User, LayoutDashboard } from "lucide-react";

const navLinks = [
  { href: "/shop/account", label: "Overview", icon: LayoutDashboard },
  { href: "/shop/account/orders", label: "Orders", icon: Package },
  { href: "/shop/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/shop/account/profile", label: "Profile", icon: User },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, logout } = useCustomerStore();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/shop/account/login");
    }
  }, [isLoggedIn, router]);

  function handleLogout() {
    logout();
    router.push("/shop");
  }

  function isActive(href: string) {
    if (href === "/shop/account") return pathname === "/shop/account";
    return pathname.startsWith(href);
  }

  // Don't render layout for login/register pages
  if (pathname === "/shop/account/login" || pathname === "/shop/account/register") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-ink pt-28 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Mobile nav - horizontal scroll strip */}
        <div className="md:hidden mb-8 -mx-6 px-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 font-sans text-micro uppercase tracking-widest whitespace-nowrap transition-colors duration-300 rounded-[2px] ${
                  isActive(link.href)
                    ? "text-bone bg-surface border border-psy-green/30"
                    : "text-taupe hover:text-bone"
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 font-sans text-micro uppercase tracking-widest whitespace-nowrap text-taupe hover:text-red-400 transition-colors duration-300 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-12">
          {/* Sidebar - hidden on mobile */}
          <aside className="hidden md:block">
            <h2 className="font-display text-body-lg text-bone mb-8">
              My Account
            </h2>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 font-sans text-caption uppercase tracking-widest transition-colors duration-300 ${
                    isActive(link.href)
                      ? "text-bone border-l-2 border-psy-green bg-surface/50"
                      : "text-taupe hover:text-bone border-l-2 border-transparent"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 font-sans text-caption uppercase tracking-widest text-taupe hover:text-red-400 transition-colors duration-300 border-l-2 border-transparent mt-4 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
