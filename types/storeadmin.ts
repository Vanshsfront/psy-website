/** A /storeadmin login. Roles are enforced server-side, not just in the sidebar. */
export interface StoreUser {
    id: string;
    username: string;
    role: "superadmin" | "admin" | "artist";
    /** Set only on artist logins — the studio.artists row they speak for. */
    artist_id: string | null;
    is_active: boolean;
    created_at: string;
    artists?: { name: string } | null;
}

export interface Customer {
    id: string;
    name: string;
    phone: string | null;
    instagram: string | null;
    email: string | null;
    source: string | null;
    notes: string | null;
    address?: string | null;
    created_at: string;
    updated_at: string;
    // Computed metrics
    lifetime_spend?: number;
    visit_count?: number;
    last_visit_date?: string | null;
    last_artist_name?: string | null;
    last_artist_id?: string | null;
    last_payment_mode?: string | null;
    payment_modes_used?: string[];
    orders?: Order[];
}

export interface Artist {
    id: string;
    name: string;
    is_active: boolean;
    /** External freelancer: no base pay, paid a revenue share per job. */
    is_guest_artist?: boolean;
    created_at: string;
    /**
     * The website half of the record, present since migration 012 merged the
     * two artist tables. `name` stays the studio's short working name because
     * order import matches on it; `display_name` is the full name the public
     * site shows. A null slug means this artist has no public profile.
     */
    display_name?: string | null;
    slug?: string | null;
    speciality?: string | null;
    profile_photo_url?: string | null;
}

export interface Order {
    id: string;
    customer_id: string;
    artist_id: string | null;
    order_date: string;
    service_description: string | null;
    payment_mode: string | null;
    deposit: number;
    total: number;
    comments: string | null;
    source: string | null;
    created_at: string;
    updated_at?: string;
    order_number?: string | null;
    tracking_number?: string | null;
    courier_name?: string | null;
    admin_notes?: string | null;
    discount_code?: string | null;
    discount_amount?: number | null;
    consent_signed?: boolean;
    customers?: { name: string; phone: string };
    artists?: { name: string };
}

export interface BalanceSheet {
    period: { from: string; to: string };
    /** Keyed by payment mode: upi / cash / card / unrecorded. */
    receivables: Record<string, number>;
    total_receivables: number;
    expenses_by_category: Record<string, {
        total: number;
        items: Array<{ label: string; amount: number; date: string; type: string | null }>;
    }>;
    total_expenses: number;
    net_profit: number;
    /**
     * Lines added by hand, for income and cost the order and expense tables
     * cannot know about. Signed: incomes positive, expenses negative. Already
     * included in the totals above; kept separately so the sheet can show what
     * was computed and what was added.
     */
    manual_entries?: Array<{ id: string; label: string; amount: number; kind: string; date: string }>;
    manual_income?: number;
    manual_expense?: number;
    computed_receivables?: number;
    computed_expenses?: number;
    order_count: number;
    expense_count: number;
}

/** A booking. Distinct from Order: an appointment is a promise, an order is money taken. */
export interface Appointment {
    id: string;
    customer_id: string;
    artist_id: string | null;
    starts_at: string;
    /** Null when the studio booked a start time but no finish. */
    ends_at: string | null;
    status: "booked" | "confirmed" | "completed" | "no_show" | "cancelled";
    service_description: string | null;
    deposit: number;
    estimated_total: number;
    notes: string | null;
    source: string | null;
    /** Set on completion — the revenue row this produced. */
    order_id: string | null;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    customers?: { name: string; phone: string | null; instagram: string | null };
    artists?: { name: string };
}

export interface DailyNote {
    id: string;
    note_date: string; // YYYY-MM-DD
    body: string;
    author: string | null;
    created_at: string;
}

export interface Expense {
    id: string;
    expense_date: string;
    amount: number;
    category: string;
    description: string | null;
    vendor: string | null;
    payment_mode: string | null;
    raw_input: string | null;
    /** 'petty' (paid from the studio float) or 'business'. */
    expense_type?: string | null;
    /** Photo of the bill, replacing the receipts kept in the WhatsApp group. */
    receipt_url?: string | null;
    created_at: string;
}

export interface Campaign {
    id: string;
    template_name: string;
    nl_filter_text: string | null;
    resolved_query: string | null;
    matched_count: number;
    status: string;
    created_at: string;
}

export interface MessageLog {
    id: string;
    campaign_id: string;
    customer_id: string;
    phone: string;
    template_name: string;
    rendered_payload: Record<string, unknown>;
    status: string;
    error_message: string | null;
    whatsapp_message_id: string | null;
    sent_at: string;
}

export interface WhatsAppTemplate {
    name: string;
    language: string;
    category: string;
    parameter_format?: "POSITIONAL" | "NAMED" | null;
    components: Array<{
        type: string;
        text?: string;
        format?: string;
        buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
    }>;
}

export interface TemplateWithStatus extends WhatsAppTemplate {
    id?: string;
    status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" | string;
    rejected_reason?: string | null;
}

export interface CreateTemplateInput {
    name: string;
    category: "MARKETING" | "UTILITY";
    language?: string;
    body: string;
    button_text?: string;
    button_url?: string;
    example?: string;
}

export interface OCROrderRow {
    confidence: number;
    fields: Record<string, unknown>;
}

export interface OCRResult {
    success: boolean;
    session_id?: string;
    orders: OCROrderRow[];
    raw_text?: string;
    error?: string;
}

export interface FilterResult {
    success: boolean;
    customers: Customer[];
    count: number;
    filter_conditions?: Array<{
        field: string;
        operator: string;
        value: string;
    }>;
    error?: string;
    suggestion?: string;
    inference_caution?: string | null;
    inferred_fields?: Array<{
        field: string;
        source: string;
        operator?: string;
        value?: string;
    }>;
}

export interface FinancialSummary {
    revenue: number;
    expenses: number;
    /**
     * Absent for anyone without profit.view: the API removes it rather than the
     * UI hiding it. `profit_withheld` says so explicitly, so a missing value is
     * never mistaken for zero.
     */
    profit?: number;
    profit_withheld?: boolean;
    petty_cash_balance: number;
    category_breakdown: Record<string, number>;
    order_count: number;
    expense_count: number;
}

export interface ExpenseParseResult {
    success: boolean;
    fields: {
        amount: number;
        category: string;
        description: string;
        vendor: string;
        payment_mode: string;
        date: string;
        raw_input: string;
    };
    error?: string;
}
