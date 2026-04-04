"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatRelativeDate, getSourceColor } from "@/lib/storeadmin/utils";
import type { Customer } from "@/types/storeadmin";
import {
    Search,
    Users,
    Filter,
    ChevronRight,
    Loader2,
    X,
    Trash2,
    ChevronLeft,
    ArrowUpDown,
} from "lucide-react";

type SortKey = "name" | "lifetime_spend" | "visit_count" | "last_visit_date";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 25;

function CustomersContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sourceFilter, setSourceFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(0);
    const [isRestored, setIsRestored] = useState(false);

    useEffect(() => {
        const saved = sessionStorage.getItem("psy_customers_state");
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (p.search) setSearch(p.search);
                if (p.sourceFilter) setSourceFilter(p.sourceFilter);
                if (p.showFilters) setShowFilters(p.showFilters);
            } catch { /* ignore */ }
        }
        setIsRestored(true);
    }, []);

    useEffect(() => {
        if (!isRestored) return;
        sessionStorage.setItem("psy_customers_state", JSON.stringify({ search, sourceFilter, showFilters }));
    }, [isRestored, search, sourceFilter, showFilters]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.getCustomers();
            setCustomers(res.customers);
        } catch (e) {
            console.error("Failed to load customers:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        const timer = setTimeout(() => {
            api.getCustomers({ search, source: sourceFilter }).then(res => {
                setCustomers(res.customers);
                setPage(0);
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [search, sourceFilter]);

    const handleDeleteCustomer = async (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${name}"? This also deletes all their orders.`)) return;
        try {
            await api.deleteCustomer(id);
            setCustomers(prev => prev.filter(c => c.id !== id));
        } catch {
            alert("Failed to delete. Try again.");
        }
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir(key === "name" ? "asc" : "desc");
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const sorted = [...customers].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
            case "name": cmp = (a.name || "").localeCompare(b.name || ""); break;
            case "lifetime_spend": cmp = (a.lifetime_spend || 0) - (b.lifetime_spend || 0); break;
            case "visit_count": cmp = (a.visit_count || 0) - (b.visit_count || 0); break;
            case "last_visit_date": cmp = new Date(a.last_visit_date || 0).getTime() - new Date(b.last_visit_date || 0).getTime(); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
    });

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const totalRevenue = customers.reduce((s, c) => s + (c.lifetime_spend || 0), 0);
    const avgSpend = customers.length > 0 ? totalRevenue / customers.length : 0;

    const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
        <th
            className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3 cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
            onClick={() => toggleSort(field)}
        >
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-[var(--primary)]" : ""}`} />
            </div>
        </th>
    );

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Customers</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">
                            {customers.length} customers &middot; {formatCurrency(totalRevenue)} lifetime &middot; {formatCurrency(avgSpend)} avg
                        </p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="glass-panel p-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, phone, or Instagram..."
                                className="w-full pl-10 pr-4 py-2.5 neo-input text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 neo-btn text-sm cursor-pointer ${showFilters ? "border-[var(--primary)]/30 text-[var(--primary)]" : "text-[var(--muted)]"}`}
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-3 animate-fadeIn">
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="px-3 py-2 neo-input text-sm"
                            >
                                <option value="">All Sources</option>
                                <option value="instagram">Instagram</option>
                                <option value="walk-in">Walk-in</option>
                                <option value="referral">Referral</option>
                                <option value="google">Google</option>
                            </select>
                            <button
                                onClick={() => { setSourceFilter(""); setSearch(""); setShowFilters(false); }}
                                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer transition-colors"
                            >
                                <X className="w-3 h-3" /> Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="glass-panel overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-20 text-[var(--muted)]">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No customers found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="hidden md:table-header-group">
                                        <tr className="border-b border-[var(--border-color)]">
                                            <SortHeader label="Customer" field="name" />
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Contact</th>
                                            <SortHeader label="Lifetime Spend" field="lifetime_spend" />
                                            <SortHeader label="Last Visit" field="last_visit_date" />
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Source</th>
                                            <th className="px-5 py-3 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((customer, idx) => (
                                            <tr
                                                key={customer.id}
                                                onClick={() => router.push(`/storeadmin/customers/${customer.id}`)}
                                                className="border-b border-[var(--border-color)]/50 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors animate-fadeIn flex flex-col md:table-row p-4 md:p-0 gap-1 md:gap-0"
                                                style={{ animationDelay: `${idx * 0.02}s` }}
                                            >
                                                <td className="px-2 md:px-5 py-1 md:py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[var(--border-color)] flex items-center justify-center text-xs font-bold text-white">
                                                            {customer.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{customer.name}</p>
                                                            <p className="text-xs text-[var(--muted)]">
                                                                {customer.visit_count || 0} visit{(customer.visit_count || 0) !== 1 ? "s" : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 md:px-5 py-1 md:py-3.5">
                                                    <p className="text-sm">{customer.phone || "—"}</p>
                                                    {customer.instagram && (
                                                        <p className="text-xs text-[var(--primary)]">@{customer.instagram}</p>
                                                    )}
                                                </td>
                                                <td className="px-2 md:px-5 py-1 md:py-3.5">
                                                    <span className="text-sm font-semibold text-[var(--primary)]">
                                                        {formatCurrency(customer.lifetime_spend || 0)}
                                                    </span>
                                                </td>
                                                <td className="hidden md:table-cell px-5 py-3.5">
                                                    <span className="text-sm text-[var(--muted)]">
                                                        {formatRelativeDate(customer.last_visit_date)}
                                                    </span>
                                                </td>
                                                <td className="hidden md:table-cell px-5 py-3.5">
                                                    {customer.source && (
                                                        <span className={`text-xs px-2 py-1 rounded font-medium ${getSourceColor(customer.source)}`}>
                                                            {customer.source}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 md:px-5 py-1 md:py-3.5">
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <button
                                                            onClick={(e) => handleDeleteCustomer(customer.id, customer.name, e)}
                                                            className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all cursor-pointer"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <ChevronRight className="w-4 h-4 text-[var(--muted)] hidden md:block" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)]">
                                    <p className="text-xs text-[var(--muted)]">
                                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                            const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`w-8 h-8 rounded text-xs font-medium cursor-pointer transition-colors ${page === pageNum ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                                                >
                                                    {pageNum + 1}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={page >= totalPages - 1}
                                            className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function CustomersPage() {
    return <CustomersContent />;
}
