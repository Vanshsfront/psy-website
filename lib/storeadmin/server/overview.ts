import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getDb } from "@/lib/storeadmin/server/database";

/**
 * Both businesses in one set of numbers, for the Admin overview.
 *
 * Yogesh's spec gives Admin a "Dashboard (covering both businesses)" alongside
 * the Studio and Shop dashboards, which stay as they are. The two halves live
 * in one database but different schemas: the tattoo studio in `studio`, the
 * jewellery shop in `public`. They collide on table names, which is why they
 * were split that way, so this needs a client per schema rather than one query.
 */

/** Shop side. The storeadmin client is pinned to `studio`, so this is separate. */
function getShopDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/**
 * Sum a money column across every row, paging past the 1000-row response cap.
 *
 * A bare select would silently total only the first page, which is exactly the
 * bug that made getFinancialSummary under-report revenue once the studio passed
 * a thousand orders.
 */
async function sumAllPages(db: SupabaseClient, table: string, column: string): Promise<number> {
  const PAGE = 1000;
  let total = 0;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from(table)
      .select(`id, ${column}`)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Failed to read ${table}: ${error.message}`);
    if (!data?.length) break;
    // Cast through unknown: supabase-js tries to parse the select string at the
    // type level and gives up on a template literal, leaving a ParserError type.
    // There are no generated database types in this project, so nothing is lost.
    total += data.reduce(
      (s: number, r) => s + num((r as unknown as Record<string, unknown>)[column]),
      0
    );
    if (data.length < PAGE) break;
  }
  return total;
}

/** Row count without pulling the rows. `notDeleted` skips soft-deleted records. */
async function countRows(db: SupabaseClient, table: string, notDeleted = false): Promise<number> {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (notDeleted) q = q.eq("is_deleted", false);
  const { count, error } = await q;
  if (error) throw new Error(`Failed to count ${table}: ${error.message}`);
  return count ?? 0;
}

export interface CombinedOverview {
  studio: { orders: number; revenue: number; customers: number; appointments: number };
  shop: { orders: number; revenue: number; products: number; customers: number; bookings: number };
  combinedRevenue: number;
}

export async function getCombinedOverview(): Promise<CombinedOverview> {
  const studioDb = getDb();
  const shopDb = getShopDb();

  const [
    studioOrders,
    studioRevenue,
    studioCustomers,
    studioAppointments,
    shopOrders,
    shopRevenue,
    shopProducts,
    shopCustomers,
    shopBookings,
  ] = await Promise.all([
    countRows(studioDb, "orders"),
    sumAllPages(studioDb, "orders", "total"),
    countRows(studioDb, "customers"),
    countRows(studioDb, "appointments", true),
    countRows(shopDb, "orders"),
    sumAllPages(shopDb, "orders", "total"),
    countRows(shopDb, "products", true),
    countRows(shopDb, "shop_customers"),
    countRows(shopDb, "bookings"),
  ]);

  return {
    studio: {
      orders: studioOrders,
      revenue: studioRevenue,
      customers: studioCustomers,
      appointments: studioAppointments,
    },
    shop: {
      orders: shopOrders,
      revenue: shopRevenue,
      products: shopProducts,
      customers: shopCustomers,
      bookings: shopBookings,
    },
    combinedRevenue: studioRevenue + shopRevenue,
  };
}
