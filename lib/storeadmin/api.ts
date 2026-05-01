const API_BASE = "";

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("psyshot_token");
}

// Simple in-memory cache for API GET requests (1 minute TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const clearApiCache = () => cache.clear();

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const isGet = !options.method || options.method === "GET";
    const cacheKey = path;

    // 1. Check Cache for GET requests
    if (isGet && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data as T;
        }
    }

    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("psyshot_token");
            window.location.href = "/storeadmin/login";
        }
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || "API error");
    }

    const data = await res.json();

    // 2. Manage Cache
    if (isGet) {
        // Save successful GET requests to cache
        cache.set(cacheKey, { data, timestamp: Date.now() });
    } else {
        // Invalidate cache on mutations (POST, PUT, DELETE)
        cache.clear();
    }

    return data;
}

// Auth
export const api = {
    login: (username: string, password: string) =>
        apiFetch<{ token: string; username: string; role: string }>("/api/storeadmin/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        }),

    me: () => apiFetch<{ username: string; role: string }>("/api/storeadmin/auth/me"),

    // Customers
    getCustomers: (params?: Record<string, string | number>) => {
        const query = params
            ? "?" + new URLSearchParams(
                Object.entries(params).map(([k, v]) => [k, String(v)])
            ).toString()
            : "";
        return apiFetch<{ customers: import("@/types/storeadmin").Customer[]; count: number }>(
            `/api/storeadmin/customers${query}`
        );
    },

    getCustomer: (id: string) =>
        apiFetch<import("@/types/storeadmin").Customer>(`/api/storeadmin/customers/${id}`),

    createCustomer: (data: Record<string, unknown>) =>
        apiFetch<{ created: boolean; customer?: import("@/types/storeadmin").Customer; duplicate_detected?: boolean; matches?: import("@/types/storeadmin").Customer[]; match_type?: string }>(
            "/api/storeadmin/customers",
            { method: "POST", body: JSON.stringify(data) }
        ),

    updateCustomer: (id: string, data: Record<string, unknown>) =>
        apiFetch<{ updated: boolean; customer: import("@/types/storeadmin").Customer }>(
            `/api/storeadmin/customers/${id}`,
            { method: "PUT", body: JSON.stringify(data) }
        ),

    checkDuplicate: (phone: string, instagram: string) =>
        apiFetch<{ matches: import("@/types/storeadmin").Customer[]; match_type: string }>(
            "/api/storeadmin/customers/check-duplicate",
            { method: "POST", body: JSON.stringify({ phone, instagram }) }
        ),

    deleteCustomer: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/api/storeadmin/customers/${id}`, {
            method: "DELETE",
        }),

    // Orders
    getOrders: (customerID?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (customerID) params.set("customer_id", customerID);
        if (limit) params.set("limit", String(limit));
        const query = params.toString() ? `?${params.toString()}` : "";
        return apiFetch<{ orders: import("@/types/storeadmin").Order[] }>(`/api/storeadmin/orders${query}`);
    },

    getOrder: (id: string) =>
        apiFetch<import("@/types/storeadmin").Order>(`/api/storeadmin/orders/${id}`),

    createOrder: (data: Record<string, unknown>) =>
        apiFetch<{ created: boolean; order: import("@/types/storeadmin").Order }>(
            "/api/storeadmin/orders",
            { method: "POST", body: JSON.stringify(data) }
        ),

    updateOrder: (id: string, data: Record<string, unknown>) =>
        apiFetch<{ updated: boolean; order: import("@/types/storeadmin").Order }>(
            `/api/storeadmin/orders/${id}`,
            { method: "PATCH", body: JSON.stringify(data) }
        ),

    deleteOrder: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/api/storeadmin/orders/${id}`, {
            method: "DELETE",
        }),

    // OCR
    ocrExtract: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiFetch<import("@/types/storeadmin").OCRResult>("/api/storeadmin/ocr/extract", {
            method: "POST",
            body: formData,
        });
    },

    ocrConfirm: (data: Record<string, unknown>) =>
        apiFetch<{ success: boolean; order: import("@/types/storeadmin").Order; customer_id: string }>(
            "/api/storeadmin/ocr/confirm",
            { method: "POST", body: JSON.stringify(data) }
        ),

    ocrBulkConfirm: (data: { session_id: string; orders: Array<{ fields: Record<string, unknown>; create_new_customer: boolean; customer_data?: Record<string, unknown> | null; customer_id?: string }> }) =>
        apiFetch<{ success: boolean; total: number; saved: number; failed: number; results: Array<{ success: boolean; order_id?: string; customer_name?: string; error?: string }> }>(
            "/api/storeadmin/ocr/bulk-confirm",
            { method: "POST", body: JSON.stringify(data) }
        ),

    // WhatsApp
    getTemplates: () =>
        apiFetch<{ success: boolean; templates: import("@/types/storeadmin").WhatsAppTemplate[]; error?: string }>(
            "/api/storeadmin/whatsapp/templates"
        ),

    getAllTemplates: () =>
        apiFetch<{
            success: boolean;
            templates: import("@/types/storeadmin").TemplateWithStatus[];
            error?: string;
        }>("/api/storeadmin/whatsapp/templates/all"),

    createTemplate: (data: import("@/types/storeadmin").CreateTemplateInput) =>
        apiFetch<{ success: boolean; id?: string; status?: string; error?: string }>(
            "/api/storeadmin/whatsapp/templates",
            { method: "POST", body: JSON.stringify(data) },
        ),

    deleteTemplate: (name: string) =>
        apiFetch<{ success: boolean; error?: string }>(
            `/api/storeadmin/whatsapp/templates/${encodeURIComponent(name)}`,
            { method: "DELETE" },
        ),

    generateTemplate: (brief: string) =>
        apiFetch<{
            success: boolean;
            name?: string;
            category?: string;
            body?: string;
            button_text?: string;
            button_url?: string;
            error?: string;
            raw?: string;
        }>("/api/storeadmin/whatsapp/templates/generate", {
            method: "POST",
            body: JSON.stringify({ brief }),
        }),

    filterCampaign: (filterText: string) =>
        apiFetch<import("@/types/storeadmin").FilterResult>("/api/storeadmin/campaigns/filter", {
            method: "POST",
            body: JSON.stringify({ filter_text: filterText }),
        }),

    sendCampaign: (data: {
        template_name: string;
        customer_ids: string[];
        nl_filter_text?: string;
    }) =>
        apiFetch<{
            success: boolean;
            campaign_id: string;
            total: number;
            sent: number;
            failed: number;
            results: Array<{ customer_name: string; success: boolean; error?: string }>;
        }>("/api/storeadmin/campaigns/send", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    listCampaigns: () =>
        apiFetch<{
            campaigns: Array<
                import("@/types/storeadmin").Campaign & {
                    sent_count: number;
                    failed_count: number;
                }
            >;
        }>("/api/storeadmin/campaigns"),

    getCampaign: (id: string) =>
        apiFetch<{
            campaign: import("@/types/storeadmin").Campaign;
            logs: Array<
                import("@/types/storeadmin").MessageLog & {
                    customers?: { name: string; phone: string | null; instagram: string | null } | null;
                }
            >;
        }>(`/api/storeadmin/campaigns/${id}`),

    getRecentRecipients: (templateName: string, withinDays: number) => {
        const params = new URLSearchParams();
        if (templateName) params.set("template_name", templateName);
        if (withinDays > 0) params.set("within_days", String(withinDays));
        return apiFetch<{ recipients: Record<string, { last_sent_at: string; template_name: string }> }>(
            `/api/storeadmin/campaigns/recent-recipients?${params}`
        );
    },

    getCustomerMessages: (id: string) =>
        apiFetch<{ logs: import("@/types/storeadmin").MessageLog[] }>(
            `/api/storeadmin/customers/${id}/messages`
        ),

    // Expenses
    parseExpense: (text: string) =>
        apiFetch<import("@/types/storeadmin").ExpenseParseResult>("/api/storeadmin/expenses/parse", {
            method: "POST",
            body: JSON.stringify({ text }),
        }),

    confirmExpense: (data: Record<string, unknown>) =>
        apiFetch<{ success: boolean; expense: import("@/types/storeadmin").Expense }>(
            "/api/storeadmin/expenses/confirm",
            { method: "POST", body: JSON.stringify(data) }
        ),

    getExpenses: (params?: Record<string, string>) => {
        const query = params
            ? "?" + new URLSearchParams(params).toString()
            : "";
        return apiFetch<{ expenses: import("@/types/storeadmin").Expense[] }>(
            `/api/storeadmin/expenses${query}`
        );
    },

    // Finance
    getFinanceSummary: (dateFrom?: string, dateTo?: string) => {
        const params = new URLSearchParams();
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        const query = params.toString() ? `?${params}` : "";
        return apiFetch<import("@/types/storeadmin").FinancialSummary>(
            `/api/storeadmin/finance/summary${query}`
        );
    },

    // Artists
    getArtists: (includeInactive: boolean = false) =>
        apiFetch<{ artists: import("@/types/storeadmin").Artist[] }>(
            `/api/storeadmin/artists${includeInactive ? "?include_inactive=true" : ""}`
        ),

    updateArtist: (id: string, data: Record<string, unknown>) =>
        apiFetch<{ updated: boolean; artist: import("@/types/storeadmin").Artist }>(
            `/api/storeadmin/artists/${id}`,
            { method: "PATCH", body: JSON.stringify(data) }
        ),

    // Daily notes (cash-tally comments per date)
    getDailyNotes: (dateFrom?: string, dateTo?: string) => {
        const params = new URLSearchParams();
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        const query = params.toString() ? `?${params}` : "";
        return apiFetch<{ notes: import("@/types/storeadmin").DailyNote[] }>(
            `/api/storeadmin/daily-notes${query}`
        );
    },

    createDailyNote: (data: { note_date: string; body: string }) =>
        apiFetch<{ created: boolean; note: import("@/types/storeadmin").DailyNote }>(
            `/api/storeadmin/daily-notes`,
            { method: "POST", body: JSON.stringify(data) }
        ),

    deleteDailyNote: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/api/storeadmin/daily-notes/${id}`, {
            method: "DELETE",
        }),

    // Petty Cash
    getPettyCashBalance: () =>
        apiFetch<{ balance: number; total_topups: number; total_expenses: number }>("/api/storeadmin/petty-cash/balance"),

    topupPettyCash: (amount: number, note?: string) =>
        apiFetch<{ success: boolean; expense: import("@/types/storeadmin").Expense }>("/api/storeadmin/petty-cash/topup", {
            method: "POST",
            body: JSON.stringify({ amount, note }),
        }),

    // Export
    exportMastersheet: async (): Promise<Blob> => {
        const token = getToken();
        const res = await fetch(`/api/storeadmin/export/mastersheet`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
    },
};
