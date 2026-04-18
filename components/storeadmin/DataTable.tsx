"use client";

import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Filter as FilterIcon,
    Search,
    X,
} from "lucide-react";

export type DataTableColType = "text" | "number" | "date" | "enum" | "multi-enum";

export interface DataTableColumn<Row> {
    key: string;
    label: string;
    accessor: (row: Row) => unknown;
    render?: (row: Row) => React.ReactNode;
    type: DataTableColType;
    sortable?: boolean;
    filterable?: boolean;
    align?: "left" | "right";
    width?: string;
    facetLabel?: (value: string) => string;
}

type TextFilter = { kind: "text"; q: string };
type RangeFilter = { kind: "range"; min: string; max: string };
type DateRangeFilter = { kind: "date-range"; from: string; to: string };
type SetFilter = { kind: "set"; selected: string[] };
type FilterValue = TextFilter | RangeFilter | DateRangeFilter | SetFilter;

interface DataTableProps<Row> {
    rows: Row[];
    columns: DataTableColumn<Row>[];
    rowKey: (row: Row) => string;
    onRowClick?: (row: Row) => void;
    pageSize?: number;
    storageKey?: string;
    globalSearch?: { placeholder?: string; accessor: (row: Row) => string };
    summary?: (filteredRows: Row[]) => React.ReactNode;
    emptyState?: React.ReactNode;
    loading?: boolean;
}

const EMPTY_LABEL = "(empty)";

function defaultFilterFor(type: DataTableColType): FilterValue {
    switch (type) {
        case "text":
            return { kind: "text", q: "" };
        case "number":
            return { kind: "range", min: "", max: "" };
        case "date":
            return { kind: "date-range", from: "", to: "" };
        case "enum":
        case "multi-enum":
            return { kind: "set", selected: [] };
    }
}

function isFilterActive(f: FilterValue): boolean {
    switch (f.kind) {
        case "text":
            return f.q.trim().length > 0;
        case "range":
            return f.min !== "" || f.max !== "";
        case "date-range":
            return f.from !== "" || f.to !== "";
        case "set":
            return f.selected.length > 0;
    }
}

function toStringList(v: unknown): string[] {
    if (v == null) return [];
    if (Array.isArray(v)) {
        const out: string[] = [];
        for (const item of v) {
            if (item == null || item === "") continue;
            out.push(String(item));
        }
        return out;
    }
    const s = String(v);
    return s === "" ? [] : [s];
}

function matchRow<Row>(row: Row, col: DataTableColumn<Row>, f: FilterValue): boolean {
    const v = col.accessor(row);
    switch (f.kind) {
        case "text": {
            if (!f.q.trim()) return true;
            const s = v == null ? "" : String(v);
            return s.toLowerCase().includes(f.q.trim().toLowerCase());
        }
        case "range": {
            const n = v == null || v === "" ? null : Number(v);
            const minN = f.min === "" ? null : Number(f.min);
            const maxN = f.max === "" ? null : Number(f.max);
            if (minN != null && (n == null || Number.isNaN(n) || n < minN)) return false;
            if (maxN != null && (n == null || Number.isNaN(n) || n > maxN)) return false;
            return true;
        }
        case "date-range": {
            if (!f.from && !f.to) return true;
            const d = v == null || v === "" ? null : new Date(String(v)).getTime();
            if (d == null || Number.isNaN(d)) return false;
            if (f.from) {
                const fromTs = new Date(f.from).getTime();
                if (d < fromTs) return false;
            }
            if (f.to) {
                const toTs = new Date(f.to).getTime() + 24 * 60 * 60 * 1000 - 1;
                if (d > toTs) return false;
            }
            return true;
        }
        case "set": {
            if (f.selected.length === 0) return true;
            const values = toStringList(v);
            const set = new Set(f.selected);
            if (values.length === 0) return set.has(EMPTY_LABEL);
            return values.some((x) => set.has(x));
        }
    }
}

function compareByColumn<Row>(a: Row, b: Row, col: DataTableColumn<Row>): number {
    const av = col.accessor(a);
    const bv = col.accessor(b);
    const aNull = av == null || av === "";
    const bNull = bv == null || bv === "";
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    switch (col.type) {
        case "number":
            return Number(av) - Number(bv);
        case "date":
            return new Date(String(av)).getTime() - new Date(String(bv)).getTime();
        default: {
            const as = Array.isArray(av) ? (av as unknown[]).join(", ") : String(av);
            const bs = Array.isArray(bv) ? (bv as unknown[]).join(", ") : String(bv);
            return as.localeCompare(bs);
        }
    }
}

interface PersistedState {
    sort: { key: string; dir: "asc" | "desc" } | null;
    filters: Record<string, FilterValue>;
    globalQ: string;
    page: number;
}

export default function DataTable<Row>({
    rows,
    columns,
    rowKey,
    onRowClick,
    pageSize = 25,
    storageKey,
    globalSearch,
    summary,
    emptyState,
    loading,
}: DataTableProps<Row>) {
    const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
    const [filters, setFilters] = useState<Record<string, FilterValue>>({});
    const [globalQ, setGlobalQ] = useState("");
    const [page, setPage] = useState(0);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [restored, setRestored] = useState(false);

    useEffect(() => {
        if (!storageKey) {
            setRestored(true);
            return;
        }
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<PersistedState>;
                if (parsed.sort) setSort(parsed.sort);
                if (parsed.filters) setFilters(parsed.filters);
                if (parsed.globalQ) setGlobalQ(parsed.globalQ);
                if (parsed.page) setPage(parsed.page);
            }
        } catch {
            /* ignore */
        }
        setRestored(true);
    }, [storageKey]);

    useEffect(() => {
        if (!restored || !storageKey) return;
        const payload: PersistedState = { sort, filters, globalQ, page };
        sessionStorage.setItem(storageKey, JSON.stringify(payload));
    }, [restored, storageKey, sort, filters, globalQ, page]);

    const activeFilters = useMemo(
        () => Object.entries(filters).filter(([, f]) => isFilterActive(f)),
        [filters]
    );

    const baseFiltered = (excludeKey?: string): Row[] => {
        const gq = globalQ.trim().toLowerCase();
        return rows.filter((row) => {
            if (gq && globalSearch) {
                const t = globalSearch.accessor(row).toLowerCase();
                if (!t.includes(gq)) return false;
            }
            for (const [k, f] of activeFilters) {
                if (k === excludeKey) continue;
                const col = columns.find((c) => c.key === k);
                if (!col) continue;
                if (!matchRow(row, col, f)) return false;
            }
            return true;
        });
    };

    const filtered = useMemo(
        () => baseFiltered(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [rows, columns, globalQ, filters]
    );

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const col = columns.find((c) => c.key === sort.key);
        if (!col) return filtered;
        const sorted = [...filtered].sort((a, b) => compareByColumn(a, b, col));
        return sort.dir === "asc" ? sorted : sorted.reverse();
    }, [filtered, sort, columns]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

    const toggleSort = (key: string) => {
        setSort((prev) => {
            if (!prev || prev.key !== key) return { key, dir: "desc" };
            if (prev.dir === "desc") return { key, dir: "asc" };
            return null;
        });
    };

    const setFilter = (key: string, f: FilterValue) => {
        setFilters((prev) => ({ ...prev, [key]: f }));
        setPage(0);
    };

    const clearFilter = (key: string) => {
        setFilters((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setPage(0);
    };

    const clearAll = () => {
        setFilters({});
        setGlobalQ("");
        setPage(0);
    };

    const facetCounts = (col: DataTableColumn<Row>): Array<{ value: string; count: number }> => {
        const base = baseFiltered(col.key);
        const counts = new Map<string, number>();
        for (const row of base) {
            const vals = toStringList(col.accessor(row));
            if (vals.length === 0) {
                counts.set(EMPTY_LABEL, (counts.get(EMPTY_LABEL) ?? 0) + 1);
            } else {
                for (const v of vals) {
                    counts.set(v, (counts.get(v) ?? 0) + 1);
                }
            }
        }
        return Array.from(counts.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => {
                if (a.value === EMPTY_LABEL) return 1;
                if (b.value === EMPTY_LABEL) return -1;
                return b.count - a.count || a.value.localeCompare(b.value);
            });
    };

    return (
        <div className="space-y-4">
            {(globalSearch || activeFilters.length > 0 || globalQ) && (
                <div className="glass-panel p-3 flex items-center gap-3">
                    {globalSearch && (
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                            <input
                                type="text"
                                value={globalQ}
                                onChange={(e) => {
                                    setGlobalQ(e.target.value);
                                    setPage(0);
                                }}
                                placeholder={globalSearch.placeholder || "Search…"}
                                className="w-full pl-10 pr-4 py-2 neo-input text-sm"
                            />
                        </div>
                    )}
                    {(activeFilters.length > 0 || globalQ) && (
                        <button
                            type="button"
                            onClick={clearAll}
                            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--danger)] px-2 py-1 cursor-pointer"
                        >
                            <X className="w-3 h-3" /> Clear all
                        </button>
                    )}
                    {summary && (
                        <div className="text-xs text-[var(--muted)] whitespace-nowrap">
                            {summary(filtered)}
                        </div>
                    )}
                </div>
            )}

            <div className="glass-panel overflow-visible">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-color)]">
                                {columns.map((col) => {
                                    const isSorted = sort?.key === col.key;
                                    const f = filters[col.key];
                                    const active = f ? isFilterActive(f) : false;
                                    return (
                                        <th
                                            key={col.key}
                                            className={`px-4 py-3 text-xs font-medium text-[var(--muted)] uppercase tracking-wider select-none ${col.align === "right" ? "text-right" : "text-left"}`}
                                            style={col.width ? { width: col.width } : undefined}
                                        >
                                            <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                                                {col.sortable !== false ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSort(col.key)}
                                                        className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                                        aria-sort={
                                                            isSorted
                                                                ? sort!.dir === "asc"
                                                                    ? "ascending"
                                                                    : "descending"
                                                                : "none"
                                                        }
                                                    >
                                                        {col.label}
                                                        {isSorted ? (
                                                            sort!.dir === "asc" ? (
                                                                <ArrowUp className="w-3 h-3 text-[var(--primary)]" />
                                                            ) : (
                                                                <ArrowDown className="w-3 h-3 text-[var(--primary)]" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span>{col.label}</span>
                                                )}
                                                {col.filterable !== false && (
                                                    <FilterTrigger
                                                        active={active}
                                                        open={openPopover === col.key}
                                                        onToggle={() =>
                                                            setOpenPopover((p) => (p === col.key ? null : col.key))
                                                        }
                                                    >
                                                        {openPopover === col.key && (
                                                            <FilterPopover
                                                                column={col}
                                                                value={filters[col.key] || defaultFilterFor(col.type)}
                                                                facets={
                                                                    col.type === "enum" || col.type === "multi-enum"
                                                                        ? facetCounts(col)
                                                                        : []
                                                                }
                                                                onChange={(v) => setFilter(col.key, v)}
                                                                onClear={() => clearFilter(col.key)}
                                                                onClose={() => setOpenPopover(null)}
                                                            />
                                                        )}
                                                    </FilterTrigger>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="text-center py-20 text-[var(--muted)]"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="text-center py-20 text-[var(--muted)]"
                                    >
                                        {emptyState ?? "No results"}
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((row, idx) => (
                                    <tr
                                        key={rowKey(row)}
                                        tabIndex={onRowClick ? 0 : undefined}
                                        role={onRowClick ? "button" : undefined}
                                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                                        onKeyDown={
                                            onRowClick
                                                ? (e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        onRowClick(row);
                                                    }
                                                }
                                                : undefined
                                        }
                                        className={`border-b border-[var(--border-color-subtle)] transition-colors animate-fadeIn ${onRowClick ? "cursor-pointer hover:bg-[var(--surface-hover)]" : ""}`}
                                        style={{ animationDelay: `${Math.min(idx, 20) * 0.015}s` }}
                                    >
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={`px-4 py-3 text-sm ${col.align === "right" ? "text-right" : ""}`}
                                            >
                                                {col.render ? col.render(row) : renderDefault(col.accessor(row))}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
                        <p className="text-xs text-[var(--muted)]">
                            {safePage * pageSize + 1}–
                            {Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={safePage === 0}
                                className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors"
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const pageNum =
                                    totalPages <= 5
                                        ? i
                                        : Math.max(0, Math.min(safePage - 2, totalPages - 5)) + i;
                                return (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setPage(pageNum)}
                                        className={`w-8 h-8 rounded text-xs font-medium cursor-pointer transition-colors ${safePage === pageNum ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                                    >
                                        {pageNum + 1}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={safePage >= totalPages - 1}
                                className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 cursor-pointer transition-colors"
                                aria-label="Next page"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function renderDefault(v: unknown): React.ReactNode {
    if (v == null || v === "") return <span className="text-[var(--muted)]">—</span>;
    if (Array.isArray(v)) return (v as unknown[]).map(String).join(", ");
    return String(v);
}

function FilterTrigger({
    active,
    open,
    onToggle,
    children,
}: {
    active: boolean;
    open: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
}) {
    const btnRef = useRef<HTMLButtonElement | null>(null);
    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`p-1 rounded transition-colors cursor-pointer ${active ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label="Filter column"
            >
                <FilterIcon className="w-3 h-3" />
            </button>
            {open && (
                <PopoverAnchor triggerRef={btnRef}>
                    {children}
                </PopoverAnchor>
            )}
        </>
    );
}

function PopoverAnchor({
    triggerRef,
    children,
}: {
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    children: React.ReactNode;
}) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        const reposition = () => {
            const t = triggerRef.current;
            if (!t) return;
            const rect = t.getBoundingClientRect();
            const width = containerRef.current?.offsetWidth ?? 260;
            const margin = 8;
            let left = rect.left;
            if (left + width > window.innerWidth - margin) {
                left = Math.max(margin, window.innerWidth - width - margin);
            }
            const top = rect.bottom + 4;
            setPos({ top, left });
        };
        reposition();
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        return () => {
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
        };
    }, [triggerRef]);

    if (!pos) return null;

    return (
        <div
            ref={containerRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 60 }}
        >
            {children}
        </div>
    );
}

function FilterPopover<Row>({
    column,
    value,
    facets,
    onChange,
    onClear,
    onClose,
}: {
    column: DataTableColumn<Row>;
    value: FilterValue;
    facets: Array<{ value: string; count: number }>;
    onChange: (v: FilterValue) => void;
    onClear: () => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            }
        };
        // Defer so the opening click doesn't close it immediately.
        const t = setTimeout(() => {
            document.addEventListener("mousedown", onDoc);
        }, 0);
        document.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label={`Filter ${column.label}`}
            onClick={(e) => e.stopPropagation()}
            className="min-w-[240px] max-w-[320px] glass-panel p-3 shadow-2xl normal-case tracking-normal text-sm text-[var(--foreground)]"
        >
            {value.kind === "text" && (
                <input
                    autoFocus
                    type="text"
                    value={value.q}
                    onChange={(e) => onChange({ kind: "text", q: e.target.value })}
                    placeholder={`Filter ${column.label}…`}
                    className="w-full px-3 py-2 neo-input text-sm"
                />
            )}

            {value.kind === "range" && (
                <div className="flex items-center gap-2">
                    <input
                        autoFocus
                        type="number"
                        value={value.min}
                        onChange={(e) => onChange({ ...value, min: e.target.value })}
                        placeholder="Min"
                        className="w-full px-3 py-2 neo-input text-sm"
                    />
                    <span className="text-[var(--muted)]">–</span>
                    <input
                        type="number"
                        value={value.max}
                        onChange={(e) => onChange({ ...value, max: e.target.value })}
                        placeholder="Max"
                        className="w-full px-3 py-2 neo-input text-sm"
                    />
                </div>
            )}

            {value.kind === "date-range" && (
                <div className="flex flex-col gap-2">
                    <input
                        autoFocus
                        type="date"
                        value={value.from}
                        onChange={(e) => onChange({ ...value, from: e.target.value })}
                        className="w-full px-3 py-2 neo-input text-sm [color-scheme:dark]"
                    />
                    <input
                        type="date"
                        value={value.to}
                        onChange={(e) => onChange({ ...value, to: e.target.value })}
                        className="w-full px-3 py-2 neo-input text-sm [color-scheme:dark]"
                    />
                </div>
            )}

            {value.kind === "set" && (
                <SetFilterUi
                    column={column}
                    value={value}
                    facets={facets}
                    onChange={onChange}
                />
            )}

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-color)]">
                <button
                    type="button"
                    onClick={onClear}
                    className="text-xs text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer"
                >
                    Clear
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-[var(--primary)] hover:opacity-80 cursor-pointer"
                >
                    Done
                </button>
            </div>
        </div>
    );
}

function SetFilterUi<Row>({
    column,
    value,
    facets,
    onChange,
}: {
    column: DataTableColumn<Row>;
    value: SetFilter;
    facets: Array<{ value: string; count: number }>;
    onChange: (v: FilterValue) => void;
}) {
    const [q, setQ] = useState("");
    const filtered = useMemo(() => {
        if (!q.trim()) return facets;
        const lq = q.trim().toLowerCase();
        return facets.filter((f) => f.value.toLowerCase().includes(lq));
    }, [facets, q]);

    const toggle = (val: string) => {
        const set = new Set(value.selected);
        if (set.has(val)) set.delete(val);
        else set.add(val);
        onChange({ kind: "set", selected: Array.from(set) });
    };

    return (
        <div className="flex flex-col gap-2">
            {facets.length > 8 && (
                <input
                    autoFocus
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search values…"
                    className="w-full px-3 py-2 neo-input text-sm"
                />
            )}
            <div className="max-h-64 overflow-y-auto flex flex-col divide-y divide-[var(--border-color-subtle)]">
                {filtered.length === 0 && (
                    <div className="text-xs text-[var(--muted)] py-2 text-center">No values</div>
                )}
                {filtered.map((f) => {
                    const checked = value.selected.includes(f.value);
                    return (
                        <label
                            key={f.value}
                            className="flex items-center justify-between gap-2 py-1.5 cursor-pointer hover:bg-[var(--surface-hover)]/40 rounded px-1"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(f.value)}
                                    className="w-3.5 h-3.5 accent-[var(--primary)]"
                                />
                                <span className="text-sm truncate">
                                    {column.facetLabel ? column.facetLabel(f.value) : f.value}
                                </span>
                            </div>
                            <span className="text-xs text-[var(--muted)] tabular-nums">
                                {f.count}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
