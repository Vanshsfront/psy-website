"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import { formatCurrency } from "@/lib/storeadmin/utils";
import { can } from "@/lib/auth/permissions";
import { Loader2 } from "lucide-react";

/**
 * Both businesses on one screen, for the Admin login.
 *
 * The Studio and Shop dashboards stay exactly as they are; this sits alongside
 * them rather than replacing either, which is what Yogesh chose when asked: a
 * Manager working only on tattoos should not have jewellery figures pushed at
 * them, but the owner wants one place showing the whole picture.
 *
 * It is a money screen, so it is Admin-only on the API as well as here.
 */

interface Overview {
    studio: { orders: number; revenue: number; customers: number; appointments: number };
    shop: { orders: number; revenue: number; products: number; customers: number; bookings: number };
    combinedRevenue: number;
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-5 rounded border border-[var(--border-color)] bg-[var(--surface)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
            <p className="font-display text-2xl mt-1">{value}</p>
        </div>
    );
}

export default function OverviewPage() {
    const { isAuthenticated, loading: authLoading, role } = useAuth();
    const router = useRouter();

    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    // Managers are sent away rather than shown an empty screen and a 403.
    useEffect(() => {
        if (!authLoading && isAuthenticated && role && !can(role, "overview.view")) {
            router.push("/storeadmin");
        }
    }, [authLoading, isAuthenticated, role, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            const res = await api.getOverview();
            setData(res.overview);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load the overview");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && can(role, "overview.view")) load();
    }, [isAuthenticated, role, load]);

    if (authLoading || !isAuthenticated || !can(role, "overview.view")) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10">
                <header className="mb-8">
                    <h1 className="font-display text-4xl font-bold">Both Businesses</h1>
                    <p className="text-sm text-[var(--muted)] mt-1">
                        The tattoo studio and the jewellery shop together.
                    </p>
                </header>

                {error && (
                    <div className="mb-6 px-4 py-3 rounded border border-[var(--danger)]/40 text-[var(--danger)] text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : data ? (
                    <>
                        <div className="mb-10 p-6 rounded border border-[var(--primary)]/30 bg-[var(--surface)]">
                            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                Combined revenue, all time
                            </p>
                            <p className="font-display text-4xl mt-1">{formatCurrency(data.combinedRevenue)}</p>
                            <p className="text-xs text-[var(--muted)] mt-2">
                                Studio {formatCurrency(data.studio.revenue)} · Shop{" "}
                                {formatCurrency(data.shop.revenue)}
                            </p>
                        </div>

                        <section className="mb-10">
                            <h2 className="font-display text-2xl mb-4">Studio</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Stat label="Revenue" value={formatCurrency(data.studio.revenue)} />
                                <Stat label="Orders" value={String(data.studio.orders)} />
                                <Stat label="Customers" value={String(data.studio.customers)} />
                                <Stat label="Appointments" value={String(data.studio.appointments)} />
                            </div>
                        </section>

                        <section>
                            <h2 className="font-display text-2xl mb-4">Shop</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <Stat label="Revenue" value={formatCurrency(data.shop.revenue)} />
                                <Stat label="Orders" value={String(data.shop.orders)} />
                                <Stat label="Products" value={String(data.shop.products)} />
                                <Stat label="Customers" value={String(data.shop.customers)} />
                                <Stat label="Enquiries" value={String(data.shop.bookings)} />
                            </div>
                        </section>
                    </>
                ) : null}
            </main>
        </div>
    );
}
