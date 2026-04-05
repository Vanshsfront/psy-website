"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatRelativeDate, getSourceColor, getPaymentColor } from "@/lib/storeadmin/utils";
import type { Customer, Order, Artist } from "@/types/storeadmin";
import {
    Users,
    Loader2,
    ClipboardList,
    ArrowUpRight,
    Palette,
} from "lucide-react";
import Link from "next/link";

function DashboardContent() {
    const { isAuthenticated, loading: authLoading, username, role } = useAuth();
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [custRes, orderRes, artistRes] = await Promise.all([
                api.getCustomers(),
                api.getOrders(),
                api.getArtists(),
            ]);
            setCustomers(custRes.customers);
            setOrders(orderRes.orders);
            setArtists(artistRes.artists);
        } catch (e) {
            console.error("Failed to load dashboard data:", e);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    // Compute metrics
    const totalCustomers = customers.length;
    const totalOrders = orders.length;

    // This month's data
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ordersThisMonth = orders.filter(o => new Date(o.order_date) >= thisMonthStart);
    const newCustomersThisMonth = customers.filter(c => new Date(c.created_at) >= thisMonthStart).length;

    // Recent orders (last 5)
    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
        .slice(0, 6);

    // Top artists by revenue
    const artistRevenue: Record<string, { name: string; revenue: number; count: number }> = {};
    orders.forEach(o => {
        const artistName = o.artists?.name || "Unassigned";
        const artistId = o.artist_id || "unassigned";
        if (!artistRevenue[artistId]) {
            artistRevenue[artistId] = { name: artistName, revenue: 0, count: 0 };
        }
        artistRevenue[artistId].revenue += o.total || 0;
        artistRevenue[artistId].count += 1;
    });
    const topArtists = Object.values(artistRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    const maxArtistRevenue = topArtists[0]?.revenue || 1;

    // Customer source breakdown
    const sourceCounts: Record<string, number> = {};
    customers.forEach(c => {
        const src = c.source || "unknown";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });
    const sourceEntries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
    const totalSourced = sourceEntries.reduce((s, [, c]) => s + c, 0) || 1;

    const sourceColors: Record<string, string> = {
        instagram: "bg-[var(--primary)]",
        "walk-in": "bg-[var(--accent)]",
        referral: "bg-[var(--muted-terracotta)]",
        google: "bg-[var(--muted)]",
        unknown: "bg-zinc-600",
    };

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-display text-4xl font-bold">System Overview</h1>
                    <p className="text-[var(--muted)] mt-1 text-sm">
                        Welcome back{username ? `, ${username}` : ""}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid gap-6 mb-12 grid-cols-2">
                            <Link href="/storeadmin/orders" className="neo-card p-5 animate-fadeIn cursor-pointer" style={{ animationDelay: "0.05s" }}>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Orders</span>
                                    <ClipboardList className="w-4 h-4 text-[var(--muted)]" />
                                </div>
                                <div className="text-3xl font-bold">{ordersThisMonth.length}</div>
                                <p className="text-xs text-[var(--muted)] mt-1">{totalOrders} all time</p>
                            </Link>

                            <Link href="/storeadmin/customers" className="neo-card p-5 animate-fadeIn cursor-pointer" style={{ animationDelay: "0.1s" }}>
                                <div className="flex items-center justify-between pb-2">
                                    <span className="text-sm font-medium text-[var(--muted)]">Customers</span>
                                    <Users className="w-4 h-4 text-[var(--muted)]" />
                                </div>
                                <div className="text-3xl font-bold">{totalCustomers}</div>
                                <p className="text-xs text-[var(--muted)] mt-1">+{newCustomersThisMonth} this month</p>
                            </Link>
                        </div>

                        {/* Main content grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Recent Orders */}
                            <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded overflow-hidden animate-fadeIn" style={{ animationDelay: "0.2s" }}>
                                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                                    <h2 className="font-display font-bold text-xl">Recent Orders</h2>
                                    <Link href="/storeadmin/orders" className="text-[var(--primary)] text-sm">View All</Link>
                                </div>
                                {recentOrders.length === 0 ? (
                                    <div className="p-6 text-center text-[var(--muted)] text-sm">No recent orders.</div>
                                ) : (
                                    <div className="divide-y divide-[var(--border-color)]">
                                        {recentOrders.map((order) => (
                                            <div key={order.id} className="p-6 flex justify-between items-center hover:bg-[var(--surface-hover)] transition-colors">
                                                <div>
                                                    <p className="font-medium text-sm text-[var(--foreground)] mb-1">{order.customers?.name || "Unknown"}</p>
                                                    <p className="text-xs font-mono text-[var(--muted)]">
                                                        {order.service_description || "No description"} &middot; {order.artists?.name || "Unassigned"}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {role === "superadmin" && (
                                                        <p className="text-sm font-mono text-[var(--foreground)]">{formatCurrency(order.total)}</p>
                                                    )}
                                                    <p className="text-xs text-[var(--muted)]">{formatRelativeDate(order.order_date)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right column */}
                            <div className="space-y-8">
                                {/* Top Artists */}
                                <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded overflow-hidden animate-fadeIn" style={{ animationDelay: "0.25s" }}>
                                    <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                                        <h2 className="font-display font-bold text-xl">Top Artists</h2>
                                        <Link href="/storeadmin/artists" className="text-[var(--primary)] text-sm">View All</Link>
                                    </div>
                                    <div className="p-6">
                                        {topArtists.length === 0 ? (
                                            <p className="text-sm text-[var(--muted)]">No data yet</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {topArtists.map((artist, idx) => (
                                                    <div key={artist.name}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-[var(--muted)] w-4">{idx + 1}</span>
                                                                <span className="text-sm font-medium">{artist.name}</span>
                                                            </div>
                                                            {role === "superadmin" && (
                                                                <span className="text-sm font-semibold text-[var(--primary)]">{formatCurrency(artist.revenue)}</span>
                                                            )}
                                                        </div>
                                                        <div className="ml-6 h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                                                                style={{ width: `${(artist.revenue / maxArtistRevenue) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Customer Sources */}
                                <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded p-6 animate-fadeIn" style={{ animationDelay: "0.3s" }}>
                                    <h2 className="font-display font-bold text-xl mb-4">Customer Sources</h2>

                                    {/* Stacked bar */}
                                    <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
                                        {sourceEntries.map(([source, count]) => (
                                            <div
                                                key={source}
                                                className={`${sourceColors[source] || "bg-zinc-600"} transition-all duration-500`}
                                                style={{ width: `${(count / totalSourced) * 100}%` }}
                                                title={`${source}: ${count}`}
                                            />
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        {sourceEntries.map(([source, count]) => (
                                            <div key={source} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${sourceColors[source] || "bg-zinc-600"}`} />
                                                    <span className="text-sm capitalize">{source}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">{count}</span>
                                                    <span className="text-xs text-[var(--muted)]">({Math.round((count / totalSourced) * 100)}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default function HomePage() {
    return <DashboardContent />;
}
