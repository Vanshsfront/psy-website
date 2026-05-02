"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import type { Artist, Order } from "@/types/storeadmin";
import {
    Palette,
    Loader2,
    ClipboardList,
    TrendingUp,
    DollarSign,
    PlusCircle,
} from "lucide-react";
import { clearApiCache } from "@/lib/storeadmin/api";

function ArtistsContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [artists, setArtists] = useState<Artist[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [artistRes, orderRes] = await Promise.all([
                api.getArtists(true),
                api.getOrders(),
            ]);
            setArtists(artistRes.artists);
            setOrders(orderRes.orders);
        } catch (e) {
            console.error("Failed to load artists:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        setCreating(true);
        setCreateError(null);
        try {
            const res = await api.createArtist(name);
            clearApiCache();
            setArtists((prev) => [...prev, res.artist]);
            setNewName("");
            setShowAdd(false);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to add artist";
            setCreateError(msg);
        } finally {
            setCreating(false);
        }
    };

    const toggleActive = async (artist: Artist) => {
        setTogglingId(artist.id);
        const next = !artist.is_active;
        setArtists((prev) =>
            prev.map((a) => (a.id === artist.id ? { ...a, is_active: next } : a))
        );
        try {
            await api.updateArtist(artist.id, { is_active: next });
            clearApiCache();
        } catch (e) {
            console.error("Toggle failed:", e);
            setArtists((prev) =>
                prev.map((a) => (a.id === artist.id ? { ...a, is_active: !next } : a))
            );
            alert("Failed to update artist status");
        } finally {
            setTogglingId(null);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const artistStats: Record<string, { revenue: number; count: number; avgOrder: number; customers: Set<string> }> = {};
    artists.forEach(a => {
        artistStats[a.id] = { revenue: 0, count: 0, avgOrder: 0, customers: new Set() };
    });
    orders.forEach(o => {
        if (o.artist_id && artistStats[o.artist_id]) {
            artistStats[o.artist_id].revenue += o.total || 0;
            artistStats[o.artist_id].count += 1;
            if (o.customer_id) artistStats[o.artist_id].customers.add(o.customer_id);
        }
    });
    Object.values(artistStats).forEach(s => {
        s.avgOrder = s.count > 0 ? s.revenue / s.count : 0;
    });

    const sortedArtists = [...artists].sort((a, b) =>
        (artistStats[b.id]?.revenue || 0) - (artistStats[a.id]?.revenue || 0)
    );
    const maxRevenue = sortedArtists.length > 0 ? (artistStats[sortedArtists[0].id]?.revenue || 1) : 1;

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Artists</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">
                            {artists.length} artists &middot; Performance & revenue
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setShowAdd(s => !s); setCreateError(null); }}
                        className="neo-btn neo-btn-primary px-5 py-2.5 text-sm flex items-center gap-2 cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Artist
                    </button>
                </div>

                {showAdd && (
                    <div className="glass-panel p-4 mb-6 animate-fadeIn">
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                                placeholder="Artist name"
                                className="flex-1 min-w-[200px] px-4 py-2.5 neo-input text-sm"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={creating || !newName.trim()}
                                className="neo-btn neo-btn-primary px-5 py-2.5 text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowAdd(false); setNewName(""); setCreateError(null); }}
                                className="neo-btn px-4 py-2.5 text-sm cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                        {createError && (
                            <p className="text-xs text-[var(--danger)] mt-2">{createError}</p>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : artists.length === 0 ? (
                    <div className="glass-panel text-center py-20 text-[var(--muted)]">
                        <Palette className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No artists found</p>
                        <p className="text-xs mt-2">Artists are created when adding orders</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedArtists.map((artist, idx) => {
                            const stats = artistStats[artist.id];
                            return (
                                <div
                                    key={artist.id}
                                    className="neo-card p-5 animate-fadeIn"
                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                >
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-white text-lg font-bold">
                                            {artist.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate">{artist.name}</h3>
                                            <p className={`text-xs ${artist.is_active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>
                                                {artist.is_active ? "Active" : "Inactive"}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleActive(artist)}
                                            disabled={togglingId === artist.id}
                                            role="switch"
                                            aria-checked={artist.is_active}
                                            title={artist.is_active ? "Deactivate (hide from new-order dropdown)" : "Activate"}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
                                                artist.is_active ? "bg-[var(--primary)]" : "bg-[var(--surface-hover)] border border-[var(--border-color)]"
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    artist.is_active ? "translate-x-6" : "translate-x-1"
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Revenue bar */}
                                    <div className="mb-4">
                                        <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[var(--primary)] transition-all duration-700"
                                                style={{ width: `${Math.max(2, (stats.revenue / maxRevenue) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <DollarSign className="w-3 h-3 text-[var(--primary)]" />
                                                <span className="text-[10px] text-[var(--muted)] uppercase">Revenue</span>
                                            </div>
                                            <p className="text-sm font-bold text-[var(--primary)]">{formatCurrency(stats.revenue)}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <ClipboardList className="w-3 h-3 text-[var(--muted)]" />
                                                <span className="text-[10px] text-[var(--muted)] uppercase">Orders</span>
                                            </div>
                                            <p className="text-sm font-bold">{stats.count}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <TrendingUp className="w-3 h-3 text-[var(--accent)]" />
                                                <span className="text-[10px] text-[var(--muted)] uppercase">Avg</span>
                                            </div>
                                            <p className="text-sm font-bold">{formatCurrency(stats.avgOrder)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ArtistsPage() {
    return <ArtistsContent />;
}
