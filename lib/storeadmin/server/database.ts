import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _db: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_KEY || "";
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_KEY must be set");
  _db = createClient(url, key);
  return _db;
}

// ── Users ──

export async function getUserByUsername(username: string) {
  const { data } = await getDb().from("users").select("*").eq("username", username);
  return data?.[0] ?? null;
}

export async function createUser(username: string, passwordHash: string) {
  const { data } = await getDb().from("users").insert({ username, password_hash: passwordHash }).select();
  return data?.[0] ?? {};
}

// ── Artists ──

export async function getArtists(activeOnly = true) {
  let q = getDb().from("artists").select("*");
  if (activeOnly) q = q.eq("is_active", true);
  const { data } = await q.order("name");
  return data ?? [];
}

export async function createArtist(name: string) {
  const { data } = await getDb().from("artists").insert({ name }).select();
  return data?.[0] ?? {};
}

export async function getArtistByName(name: string) {
  const { data } = await getDb().from("artists").select("*").ilike("name", name);
  return data?.[0] ?? null;
}

// ── Customers ──

async function batchCustomerMetrics(customerIds: string[]): Promise<Record<string, Record<string, unknown>>> {
  if (!customerIds.length) return {};

  const { data: allOrders } = await getDb()
    .from("orders")
    .select("customer_id, total, order_date, artist_id")
    .in("customer_id", customerIds)
    .order("order_date", { ascending: false });

  const ordersByCust: Record<string, Array<Record<string, unknown>>> = {};
  const artistIdsNeeded = new Set<string>();
  for (const o of allOrders ?? []) {
    const cid = o.customer_id as string;
    if (!ordersByCust[cid]) ordersByCust[cid] = [];
    ordersByCust[cid].push(o);
    if (o.artist_id) artistIdsNeeded.add(o.artist_id as string);
  }

  const artistNames: Record<string, string> = {};
  if (artistIdsNeeded.size > 0) {
    const { data: artists } = await getDb()
      .from("artists")
      .select("id, name")
      .in("id", Array.from(artistIdsNeeded));
    for (const a of artists ?? []) {
      artistNames[a.id] = a.name;
    }
  }

  const metrics: Record<string, Record<string, unknown>> = {};
  for (const cid of customerIds) {
    const orders = ordersByCust[cid] ?? [];
    const lifetimeSpend = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const visitCount = orders.length;
    const lastVisitDate = orders[0]?.order_date ?? null;
    const lastArtistId = orders[0]?.artist_id ?? null;
    const lastArtistName = lastArtistId ? artistNames[lastArtistId as string] ?? null : null;

    metrics[cid] = {
      lifetime_spend: lifetimeSpend,
      visit_count: visitCount,
      last_visit_date: lastVisitDate,
      last_artist_id: lastArtistId,
      last_artist_name: lastArtistName,
    };
  }
  return metrics;
}

export async function getCustomers(params: {
  search?: string;
  source?: string;
  artist_id?: string;
  date_from?: string;
  date_to?: string;
  spend_min?: number;
  spend_max?: number;
  limit?: number;
  offset?: number;
} = {}) {
  const { search = "", source = "", artist_id = "", date_from = "", date_to = "", spend_min = 0, spend_max = 0, limit = 100, offset = 0 } = params;

  let q = getDb().from("customers").select("*");

  if (search) {
    q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,instagram.ilike.%${search}%`);
  }
  if (source) {
    q = q.eq("source", source);
  }

  const { data: customers } = await q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  const custs = customers ?? [];

  const custIds = custs.map((c) => c.id);
  const allMetrics = await batchCustomerMetrics(custIds);

  const enriched: Record<string, unknown>[] = [];
  for (const c of custs) {
    const metrics = allMetrics[c.id] ?? {};
    const enrichedCustomer = { ...c, ...metrics };

    if (artist_id && metrics.last_artist_id !== artist_id) continue;
    if (date_from && metrics.last_visit_date && (metrics.last_visit_date as string) < date_from) continue;
    if (date_to && metrics.last_visit_date && (metrics.last_visit_date as string) > date_to) continue;
    if (spend_min && (metrics.lifetime_spend as number ?? 0) < spend_min) continue;
    if (spend_max && (metrics.lifetime_spend as number ?? 0) > spend_max) continue;

    enriched.push(enrichedCustomer);
  }

  return enriched;
}

export async function getCustomerById(customerId: string) {
  const { data } = await getDb().from("customers").select("*").eq("id", customerId);
  if (!data?.[0]) return null;
  const customer = data[0];
  const metrics = await getCustomerMetrics(customerId);
  return { ...customer, ...metrics };
}

export async function getCustomerMetrics(customerId: string) {
  const { data: orders } = await getDb()
    .from("orders")
    .select("total, order_date, artist_id")
    .eq("customer_id", customerId)
    .order("order_date", { ascending: false });

  const orderList = orders ?? [];
  const lifetimeSpend = orderList.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  const visitCount = orderList.length;
  const lastVisitDate = orderList[0]?.order_date ?? null;
  const lastArtistId = orderList[0]?.artist_id ?? null;

  let lastArtistName: string | null = null;
  if (lastArtistId) {
    const { data: artist } = await getDb().from("artists").select("name").eq("id", lastArtistId);
    if (artist?.[0]) lastArtistName = artist[0].name;
  }

  return { lifetime_spend: lifetimeSpend, visit_count: visitCount, last_visit_date: lastVisitDate, last_artist_id: lastArtistId, last_artist_name: lastArtistName };
}

export async function checkDuplicateCustomer(phone = "", instagram = "") {
  let matches: Record<string, unknown>[] = [];
  let matchType = "none";

  if (phone) {
    const { data } = await getDb().from("customers").select("*").eq("phone", phone);
    if (data?.length) {
      return { matches: data, match_type: "exact_phone" };
    }
  }

  if (instagram) {
    const { data } = await getDb().from("customers").select("*").ilike("instagram", instagram);
    if (data?.length) {
      matches = data;
      matchType = "instagram_only";
    }
  }

  return { matches, match_type: matchType };
}

export async function createCustomer(inputData: Record<string, unknown>) {
  let instagram = inputData.instagram as string | undefined;
  if (instagram && typeof instagram === "string") {
    instagram = instagram.replace(/^@/, "");
  }
  const payload: Record<string, unknown> = {
    name: inputData.name ?? "",
    phone: inputData.phone,
    instagram,
    email: inputData.email,
    source: inputData.source,
    notes: inputData.notes,
  };
  // Remove undefined/null values
  for (const k of Object.keys(payload)) {
    if (payload[k] == null) delete payload[k];
  }
  const { data } = await getDb().from("customers").insert(payload).select();
  return data?.[0] ?? {};
}

export async function updateCustomer(customerId: string, inputData: Record<string, unknown>) {
  const allowed = new Set(["name", "phone", "instagram", "email", "source", "notes"]);
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(inputData)) {
    if (allowed.has(k)) payload[k] = v;
  }
  const { data } = await getDb().from("customers").update(payload).eq("id", customerId).select();
  return data?.[0] ?? {};
}

export async function deleteCustomer(customerId: string): Promise<boolean> {
  try {
    await getDb().from("orders").delete().eq("customer_id", customerId);
    await getDb().from("customers").delete().eq("id", customerId);
    return true;
  } catch {
    return false;
  }
}

export async function searchCustomersByConditions(
  simpleFilters: Array<[string, string, string]>,
  computedFilters: Array<{ field: string; operator: string; value: string }>
) {
  const ORDER_FIELDS = new Set(["order_date", "service_description", "payment_mode", "deposit", "total", "artist_name"]);

  const customerFilters: Array<[string, string, string]> = [];
  const orderFilters: Array<[string, string, string]> = [];
  for (const [field, op, value] of simpleFilters) {
    if (ORDER_FIELDS.has(field)) {
      orderFilters.push([field, op, value]);
    } else {
      customerFilters.push([field, op, value]);
    }
  }

  // Step 1: Find customer IDs matching order filters
  let orderMatchedIds: Set<string> | null = null;
  if (orderFilters.length > 0) {
    let oq = getDb().from("orders").select("customer_id");
    for (const [field, op, value] of orderFilters) {
      if (op === "eq") oq = oq.eq(field, value);
      else if (op === "neq") oq = oq.neq(field, value);
      else if (op === "gt") oq = oq.gt(field, value);
      else if (op === "gte") oq = oq.gte(field, value);
      else if (op === "lt") oq = oq.lt(field, value);
      else if (op === "lte") oq = oq.lte(field, value);
      else if (op === "ilike") oq = oq.ilike(field, value);
    }
    const { data: orderData } = await oq;
    orderMatchedIds = new Set((orderData ?? []).map((o) => o.customer_id));
    if (orderMatchedIds.size === 0) return [];
  }

  // Step 2: Query customers
  let q = getDb().from("customers").select("*");
  for (const [field, op, value] of customerFilters) {
    if (op === "eq") q = q.eq(field, value);
    else if (op === "neq") q = q.neq(field, value);
    else if (op === "gt") q = q.gt(field, value);
    else if (op === "gte") q = q.gte(field, value);
    else if (op === "lt") q = q.lt(field, value);
    else if (op === "lte") q = q.lte(field, value);
    else if (op === "ilike") q = q.ilike(field, value);
  }
  const { data: custData } = await q;
  let customers = (custData ?? []) as Record<string, unknown>[];

  // Step 3: Intersect with order-matched IDs
  if (orderMatchedIds !== null) {
    customers = customers.filter((c) => orderMatchedIds!.has(c.id as string));
  }

  // Step 4: Enrich with metrics
  const custIds = customers.map((c) => c.id as string);
  const allMetrics = await batchCustomerMetrics(custIds);
  for (const c of customers) {
    Object.assign(c, allMetrics[c.id as string] ?? {});
  }

  // Step 5: Apply computed filters
  if (computedFilters.length > 0) {
    customers = customers.filter((customer) => {
      for (const cf of computedFilters) {
        const fieldValue = customer[cf.field];
        if (fieldValue == null) return false;

        const op = cf.operator;
        const targetValue = cf.value;

        if (op === "between" && targetValue.includes(",")) {
          const [start, end] = targetValue.split(",").map((s) => s.trim());
          const sv = String(fieldValue);
          if (!(start <= sv && sv <= end)) return false;
          continue;
        }

        // Try numeric comparison first
        const actualNum = Number(fieldValue);
        const targetNum = Number(targetValue);
        if (!isNaN(actualNum) && !isNaN(targetNum)) {
          if (op === "gt" && !(actualNum > targetNum)) return false;
          if (op === "gte" && !(actualNum >= targetNum)) return false;
          if (op === "lt" && !(actualNum < targetNum)) return false;
          if (op === "lte" && !(actualNum <= targetNum)) return false;
          if (op === "eq" && actualNum !== targetNum) return false;
          if (op === "neq" && actualNum === targetNum) return false;
        } else {
          // String comparison
          const sv = String(fieldValue);
          const tv = String(targetValue);
          if (op === "eq" && sv !== tv) return false;
          if (op === "neq" && sv === tv) return false;
          if (op === "gt" && !(sv > tv)) return false;
          if (op === "gte" && !(sv >= tv)) return false;
          if (op === "lt" && !(sv < tv)) return false;
          if (op === "lte" && !(sv <= tv)) return false;
          if (op === "ilike" && !sv.toLowerCase().includes(tv.replace(/%/g, "").toLowerCase())) return false;
        }
      }
      return true;
    });
  }

  return customers;
}

// ── Orders ──

export async function getOrders(customerId = "", limit = 100) {
  let q = getDb().from("orders").select("*, customers(name, phone), artists(name)");
  if (customerId) q = q.eq("customer_id", customerId);
  const { data } = await q.order("order_date", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getOrderById(orderId: string) {
  const { data } = await getDb()
    .from("orders")
    .select("*, customers(name, phone, instagram), artists(name)")
    .eq("id", orderId);
  return data?.[0] ?? null;
}

export async function createOrder(inputData: Record<string, unknown>) {
  const today = new Date().toISOString().split("T")[0];
  const payload: Record<string, unknown> = {
    customer_id: inputData.customer_id,
    artist_id: inputData.artist_id,
    order_date: inputData.order_date ?? today,
    service_description: inputData.service_description,
    payment_mode: inputData.payment_mode,
    deposit: inputData.deposit ?? 0,
    total: inputData.total ?? 0,
    comments: inputData.comments,
    source: inputData.source,
  };
  for (const k of Object.keys(payload)) {
    if (payload[k] == null) delete payload[k];
  }
  const { data } = await getDb().from("orders").insert(payload).select();
  return data?.[0] ?? {};
}

// ── Expenses ──

export async function getExpenses(params: { date_from?: string; date_to?: string; category?: string; limit?: number } = {}) {
  const { date_from = "", date_to = "", category = "", limit = 200 } = params;
  let q = getDb().from("expenses").select("*");
  if (date_from) q = q.gte("expense_date", date_from);
  if (date_to) q = q.lte("expense_date", date_to);
  if (category) q = q.eq("category", category);
  const { data } = await q.order("expense_date", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function createExpense(inputData: Record<string, unknown>) {
  const today = new Date().toISOString().split("T")[0];
  const payload: Record<string, unknown> = {
    expense_date: inputData.date ?? today,
    amount: inputData.amount ?? 0,
    category: inputData.category ?? "other",
    description: inputData.description,
    vendor: inputData.vendor,
    payment_mode: inputData.payment_mode,
    raw_input: inputData.raw_input,
  };
  for (const k of Object.keys(payload)) {
    if (payload[k] == null) delete payload[k];
  }
  const { data } = await getDb().from("expenses").insert(payload).select();
  return data?.[0] ?? {};
}

// ── Campaigns & Message Logs ──

export async function createCampaign(inputData: Record<string, unknown>) {
  const payload = {
    template_name: inputData.template_name,
    nl_filter_text: inputData.nl_filter_text,
    resolved_query: inputData.resolved_query,
    matched_count: inputData.matched_count ?? 0,
    status: inputData.status ?? "draft",
  };
  const { data } = await getDb().from("campaigns").insert(payload).select();
  return data?.[0] ?? {};
}

export async function updateCampaignStatus(campaignId: string, status: string) {
  const { data } = await getDb().from("campaigns").update({ status }).eq("id", campaignId).select();
  return data?.[0] ?? {};
}

export async function createMessageLog(logData: Record<string, unknown>) {
  const { data } = await getDb().from("message_logs").insert(logData).select();
  return data?.[0] ?? {};
}

// ── OCR Sessions ──

export async function createOcrSession(sessionData: Record<string, unknown>) {
  const { data } = await getDb().from("ocr_intake_sessions").insert(sessionData).select();
  return data?.[0] ?? {};
}

export async function updateOcrSession(sessionId: string, updateData: Record<string, unknown>) {
  const { data } = await getDb().from("ocr_intake_sessions").update(updateData).eq("id", sessionId).select();
  return data?.[0] ?? {};
}

// ── Financial Aggregation ──

export async function getFinancialSummary(dateFrom = "", dateTo = "") {
  let oq = getDb().from("orders").select("total");
  if (dateFrom) oq = oq.gte("order_date", dateFrom);
  if (dateTo) oq = oq.lte("order_date", dateTo);
  const { data: ordersData } = await oq;
  const revenue = (ordersData ?? []).reduce((sum, o) => sum + Number(o.total ?? 0), 0);

  let eq = getDb().from("expenses").select("amount, category");
  if (dateFrom) eq = eq.gte("expense_date", dateFrom);
  if (dateTo) eq = eq.lte("expense_date", dateTo);
  const { data: expensesData } = await eq;
  const expensesList = expensesData ?? [];
  const totalExpenses = expensesList.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

  const categoryTotals: Record<string, number> = {};
  for (const e of expensesList) {
    const cat = (e.category as string) ?? "other";
    categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(e.amount ?? 0);
  }

  return {
    revenue,
    expenses: totalExpenses,
    profit: revenue - totalExpenses,
    category_breakdown: categoryTotals,
    order_count: (ordersData ?? []).length,
    expense_count: expensesList.length,
  };
}
