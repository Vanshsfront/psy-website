"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api } from "@/lib/storeadmin/api";
import { formatCurrency, formatDate, getPaymentColor } from "@/lib/storeadmin/utils";
import type { Expense, ExpenseParseResult } from "@/types/storeadmin";
import {
    Receipt,
    Loader2,
    PlusCircle,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
} from "lucide-react";

const PAGE_SIZE = 25;

const catColors: Record<string, string> = {
    supplies: "bg-[#B8ADA4]/15 text-[#B8ADA4]",
    rent: "bg-[#2C233A]/30 text-[#B8ADA4]",
    utilities: "bg-[#C6A96B]/15 text-[#C6A96B]",
    equipment: "bg-[#3BA37C]/15 text-[#3BA37C]",
    marketing: "bg-[#C0654A]/15 text-[#C0654A]",
    salary: "bg-[#2F6F5E]/15 text-[#2F6F5E]",
    maintenance: "bg-amber-600/15 text-amber-500",
    other: "bg-zinc-500/15 text-zinc-400",
};

function ExpensesContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [page, setPage] = useState(0);

    const [showInput, setShowInput] = useState(false);
    const [expenseText, setExpenseText] = useState("");
    const [parsedExpense, setParsedExpense] = useState<ExpenseParseResult | null>(null);
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.getExpenses();
            setExpenses(res.expenses);
        } catch (e) {
            console.error("Failed to load expenses:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleParse = async () => {
        if (!expenseText.trim()) return;
        setParsing(true);
        try {
            const res = await api.parseExpense(expenseText);
            setParsedExpense(res);
        } catch {
            console.error("Parse failed");
        } finally {
            setParsing(false);
        }
    };

    const handleConfirm = async () => {
        if (!parsedExpense?.fields) return;
        setSaving(true);
        try {
            await api.confirmExpense(parsedExpense.fields);
            setParsedExpense(null);
            setExpenseText("");
            setShowInput(false);
            loadData();
        } catch {
            console.error("Confirm failed");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    let filtered = expenses;
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(e =>
            (e.description || "").toLowerCase().includes(q) ||
            (e.vendor || "").toLowerCase().includes(q) ||
            (e.category || "").toLowerCase().includes(q)
        );
    }
    if (categoryFilter) {
        filtered = filtered.filter(e => e.category === categoryFilter);
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

    const categories = [...new Set(expenses.map(e => e.category))].filter(Boolean).sort();

    const catTotals: Record<string, number> = {};
    filtered.forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10 max-w-7xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Expenses</h1>
                        <p className="text-[var(--muted)] mt-1 text-sm">
                            {filtered.length} entries &middot; {formatCurrency(totalAmount)} total
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInput(!showInput)}
                        className="neo-btn neo-btn-primary px-5 py-2.5 text-sm flex items-center gap-2 cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Log Expense
                    </button>
                </div>

                {/* NL Expense Input */}
                {showInput && (
                    <div className="glass-panel p-5 mb-5 animate-fadeIn">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                            Natural Language Expense Entry
                        </h3>
                        <div className="flex gap-3 mb-3">
                            <input
                                value={expenseText}
                                onChange={(e) => setExpenseText(e.target.value)}
                                placeholder='e.g. "Spent 2300 on inks from ABC supplier today via UPI"'
                                className="flex-1 px-4 py-2.5 neo-input text-sm"
                                onKeyDown={(e) => e.key === "Enter" && handleParse()}
                            />
                            <button
                                onClick={handleParse}
                                disabled={parsing || !expenseText.trim()}
                                className="px-5 py-2.5 neo-btn neo-btn-primary text-sm disabled:opacity-50 cursor-pointer"
                            >
                                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Parse"}
                            </button>
                        </div>

                        {parsedExpense && (
                            <div className="animate-fadeIn">
                                {parsedExpense.success ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {Object.entries(parsedExpense.fields).filter(([k]) => k !== "raw_input").map(([key, value]) => (
                                                <div key={key} className="p-3 bg-[var(--surface-hover)] rounded">
                                                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{key.replace(/_/g, " ")}</p>
                                                    <p className="text-sm font-medium mt-0.5">{key === "amount" ? formatCurrency(value as number) : String(value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleConfirm}
                                                disabled={saving}
                                                className="flex-1 py-2.5 neo-btn neo-btn-primary text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Confirm & Save</>}
                                            </button>
                                            <button onClick={() => setParsedExpense(null)} className="px-5 py-2.5 neo-btn text-sm cursor-pointer">
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-[var(--danger)]" />
                                        <span className="text-sm text-[var(--danger)]">{parsedExpense.error}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Category summary chips */}
                {topCats.length > 0 && !loading && (
                    <div className="flex flex-wrap gap-2 mb-5">
                        {topCats.map(([cat, total]) => (
                            <button
                                key={cat}
                                onClick={() => { setCategoryFilter(categoryFilter === cat ? "" : cat); setPage(0); }}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${categoryFilter === cat
                                    ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30"
                                    : `${catColors[cat]?.split(" ")[0] || "bg-zinc-500/15"} ${catColors[cat]?.split(" ")[1] || "text-zinc-400"} border border-transparent`
                                    }`}
                            >
                                <span className="capitalize">{cat}</span> &middot; {formatCurrency(total)}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search */}
                <div className="glass-panel p-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                placeholder="Search expenses..."
                                className="w-full pl-10 pr-4 py-2.5 neo-input text-sm"
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                            className="px-3 py-2.5 neo-input text-sm"
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {(search || categoryFilter) && (
                            <button
                                onClick={() => { setSearch(""); setCategoryFilter(""); }}
                                className="p-2 text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Expense List */}
                <div className="glass-panel overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="text-center py-20 text-[var(--muted)]">
                            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No expenses found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)]">
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Date</th>
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Description</th>
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Category</th>
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Vendor</th>
                                            <th className="text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Payment</th>
                                            <th className="text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-5 py-3">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((exp, idx) => (
                                            <tr
                                                key={exp.id}
                                                className="border-b border-[var(--border-color)]/50 hover:bg-[var(--surface-hover)] transition-colors animate-fadeIn"
                                                style={{ animationDelay: `${idx * 0.02}s` }}
                                            >
                                                <td className="px-5 py-3 text-sm">{formatDate(exp.expense_date)}</td>
                                                <td className="px-5 py-3 text-sm max-w-[200px] truncate">{exp.description || "\u2014"}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${catColors[exp.category] || catColors.other}`}>
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-[var(--muted)]">{exp.vendor || "\u2014"}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-sm ${getPaymentColor(exp.payment_mode)}`}>
                                                        {exp.payment_mode || "\u2014"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right text-sm font-semibold text-[var(--danger)]">
                                                    {formatCurrency(exp.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)]">
                                    <p className="text-xs text-[var(--muted)]">
                                        {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors">
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

export default function ExpensesPage() {
    return <ExpensesContent />;
}
