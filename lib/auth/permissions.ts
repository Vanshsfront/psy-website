/**
 * Who can reach what. The single source of truth.
 *
 * This used to be spread across three places that could disagree with each
 * other: `roles` arrays in components/storeadmin/Sidebar.tsx decided what the
 * nav showed, `requireRole(...)` literals in ~30 route files decided what the
 * API allowed, and bare `role === "superadmin"` checks scattered through client
 * pages decided what rendered. Changing the role model meant finding all three.
 *
 * It is one file now because the role model is about to change. Yogesh has
 * asked for Admin / Manager / Executive in place of superadmin / admin /
 * artist, and two questions about that model are still open. When the answers
 * land, this file plus a data migration is the whole change.
 *
 * WHAT IS ENCODED HERE IS TODAY'S BEHAVIOUR, EXACTLY. Nothing about the new
 * model is anticipated or guessed. It was transcribed from the existing
 * Sidebar arrays, the requireRole calls, and the inline role checks, so
 * extracting it changes nothing about who can do what.
 */

/**
 * The roles as they exist today, stored in `studio.users.role` and constrained
 * by `users_role_check`. Renaming these needs a DB migration, not just an edit.
 */
export type UserRole = "superadmin" | "admin" | "artist";

export const ALL_ROLES: readonly UserRole[] = ["superadmin", "admin", "artist"];

/** Everyone who runs the studio. Excludes artists, who see only their own work. */
export const STAFF: readonly UserRole[] = ["superadmin", "admin"];

/** The owner alone. Money and account management. */
export const OWNER: readonly UserRole[] = ["superadmin"];

/**
 * The names people see, and what each one actually gets.
 *
 * Yogesh asked for Admin / Manager / Executive. Those are labels only: the
 * stored values stay superadmin / admin / artist. Renaming them in the database
 * would mean reusing "admin" for what is currently "superadmin", so any row
 * missed by the migration would silently gain owner access. The rename buys
 * nothing and risks exactly the wrong failure, so it is not done. His words
 * appear everywhere anyone reads them.
 *
 * "Executive" is his term, from sales, chosen because it generalises past
 * tattoo artists to D2C staff later. It maps to the existing artist role, which
 * stays scoped to its own records: "I want to keep artists to their own limited
 * login."
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Admin, everything including finance and logins",
  admin: "Manager, full access to Studio and Shop",
  artist: "Executive, only their own work",
};

/** Short name for the role, for table cells and dropdowns. */
export const ROLE_NAMES: Record<UserRole, string> = {
  superadmin: "Admin",
  admin: "Manager",
  artist: "Executive",
};

/* ────────────────────────── API access ────────────────────────── */

/**
 * Which roles may call which API path.
 *
 * Matched longest-prefix-first, so `/api/storeadmin/petty-cash/topup` wins over
 * `/api/storeadmin/petty-cash`. Anything not listed is DENIED: a new route is
 * unreachable until it is added here, which is the safe direction to fail.
 *
 * `null` means the route handles its own authentication and must not be gated
 * by role. Those are deliberate and each one is explained.
 */
/**
 * Either one role list for every method, or a list per method.
 *
 * Per-method is what "view access only" needs: an Executive may GET an order
 * but must not PATCH or DELETE it. `default` covers any method not named.
 */
export type MethodAccess =
  | readonly UserRole[]
  | null
  | { default: readonly UserRole[]; [method: string]: readonly UserRole[] };

export const API_ACCESS: ReadonlyArray<{ prefix: string; roles: MethodAccess }> = [
  // Public by necessity.
  { prefix: "/api/storeadmin/auth/login", roles: null }, // issues the session
  { prefix: "/api/storeadmin/auth/logout", roles: null }, // must work on a dead session
  { prefix: "/api/storeadmin/auth/me", roles: null }, // authenticated, but every role may ask who it is
  { prefix: "/api/storeadmin/health", roles: null }, // uptime probe
  { prefix: "/api/storeadmin/whatsapp/webhook", roles: null }, // Meta callback, verified by signature

  // Owner only.
  { prefix: "/api/storeadmin/users", roles: OWNER },
  { prefix: "/api/storeadmin/finance", roles: OWNER },
  // Everyone's own earnings, which is a different question from the studio's
  // finances. Longest-prefix matching puts this ahead of the OWNER rule above.
  { prefix: "/api/storeadmin/finance/my-earnings", roles: { default: OWNER, GET: ALL_ROLES } },
  { prefix: "/api/storeadmin/export/mastersheet", roles: OWNER },
  { prefix: "/api/storeadmin/petty-cash/topup", roles: OWNER },

  // Artists reach appointments and nothing else. Their view is narrowed
  // further by scoping, see OWN_RECORDS_ONLY below.
  { prefix: "/api/storeadmin/appointments", roles: ALL_ROLES },

  // Staff.
  { prefix: "/api/storeadmin/artists", roles: STAFF },
  { prefix: "/api/storeadmin/campaigns", roles: STAFF },
  { prefix: "/api/storeadmin/customers", roles: STAFF },
  { prefix: "/api/storeadmin/daily-notes", roles: STAFF },
  { prefix: "/api/storeadmin/expenses", roles: STAFF },
  { prefix: "/api/storeadmin/ocr", roles: STAFF },
  // Executives may read their own orders and create one, never edit or delete.
  // The reading is narrowed to their own rows in the route, the same way
  // appointments are.
  { prefix: "/api/storeadmin/orders", roles: { default: STAFF, GET: ALL_ROLES, POST: ALL_ROLES } },
  { prefix: "/api/storeadmin/petty-cash", roles: STAFF },
  { prefix: "/api/storeadmin/whatsapp/templates", roles: STAFF },

  // The shop and website side, formerly /api/admin under NextAuth. That system
  // had no role concept at all: any row in admin_users could call anything.
  // STAFF is the faithful equivalent, because artists never had a login to
  // that panel in the first place, so excluding them changes nothing.
  { prefix: "/api/admin", roles: STAFF },
];

/**
 * Roles that see only their own records rather than the whole studio's.
 *
 * Scoping is applied inside the query, never by filtering results afterwards,
 * so it cannot be widened by editing a request. Today it exists for
 * appointments only; every other route excludes artists outright.
 */
export const OWN_RECORDS_ONLY: readonly UserRole[] = ["artist"];

/**
 * Resolve the roles allowed on a path and method.
 *
 * `null` means the route self-authenticates. `undefined` means no rule exists,
 * which callers must treat as denied.
 */
export function accessForPath(
  pathname: string,
  method = "GET"
): readonly UserRole[] | null | undefined {
  let best: { prefix: string; roles: MethodAccess } | undefined;
  for (const entry of API_ACCESS) {
    if (!pathname.startsWith(entry.prefix)) continue;
    if (!best || entry.prefix.length > best.prefix.length) best = entry;
  }
  if (!best) return undefined;

  const { roles } = best;
  if (roles === null || Array.isArray(roles)) return roles as readonly UserRole[] | null;

  const byMethod = roles as { default: readonly UserRole[]; [m: string]: readonly UserRole[] };
  return byMethod[method.toUpperCase()] ?? byMethod.default;
}

/* ────────────────────────── Screens ────────────────────────── */

/**
 * Which roles may open which screen, keyed by href.
 *
 * Hiding a nav item is presentation, not protection. The API gate above is
 * what actually stops anyone. This exists so the two cannot drift apart.
 */
export const SCREEN_ACCESS: Record<string, readonly UserRole[]> = {
  "/storeadmin": STAFF,
  "/storeadmin/customers": STAFF,
  "/storeadmin/orders": ALL_ROLES,
  "/storeadmin/orders/new": ALL_ROLES,
  "/storeadmin/artists": STAFF,
  "/storeadmin/campaigns": STAFF,
  "/storeadmin/expenses": STAFF,
  "/storeadmin/appointments": ALL_ROLES,
  "/storeadmin/my-earnings": ALL_ROLES,
  "/storeadmin/finance": OWNER,
  "/storeadmin/balance-sheet": OWNER,
  "/storeadmin/users": OWNER,

  // The shop and website screens, formerly the separate /admin panel. NextAuth
  // gated these on "is signed in" with no roles at all, so STAFF preserves the
  // reach exactly: artists never had a login to that panel.
  "/admin": STAFF,
  "/admin/products": STAFF,
  "/admin/portfolio": STAFF,
  "/admin/orders": STAFF,
  "/admin/inventory": STAFF,
  "/admin/collections": STAFF,
  "/admin/categories": STAFF,
  "/admin/discounts": STAFF,
  "/admin/customers": STAFF,
  "/admin/returns": STAFF,
  "/admin/guest-spots": STAFF,
  "/admin/guest-artists": STAFF,
  "/admin/testimonials": STAFF,
  "/admin/site-settings": STAFF,
  "/admin/artists": STAFF,
  "/admin/blog": STAFF,
  "/admin/bookings": STAFF,
  "/admin/community": STAFF,
};

export function canOpen(role: UserRole | null, href: string): boolean {
  if (!role) return false;
  const allowed = SCREEN_ACCESS[href];
  return allowed ? allowed.includes(role) : false;
}

/* ────────────────────────── Capabilities ────────────────────────── */

/**
 * Things a role may do *within* a screen it can already open, used to decide
 * what renders. Named for the action rather than the role, so the answer to
 * "should Managers see revenue" is a one-line edit here.
 */
export type Capability =
  /** See money on the dashboard: order totals, revenue, per-artist earnings. */
  | "revenue.view"
  /** Top up the petty cash float. */
  | "pettyCash.topup"
  /** Create, disable and reset other people's logins. */
  | "logins.manage"
  /** Open the finance and balance sheet screens. */
  | "finance.view";

const CAPABILITIES: Record<Capability, readonly UserRole[]> = {
  "revenue.view": OWNER,
  "pettyCash.topup": OWNER,
  "logins.manage": OWNER,
  "finance.view": OWNER,
};

export function can(role: UserRole | null, capability: Capability): boolean {
  if (!role) return false;
  return CAPABILITIES[capability].includes(role);
}

/* ────────────────────────── Landing ────────────────────────── */

/**
 * Where each role goes after signing in.
 *
 * This replaces `if (username === "yogesh")` in the login page, which sent one
 * hardcoded person to finance and everyone else to the dashboard. Artists were
 * landed on a dashboard that fires three requests they are not allowed to make,
 * so they arrived to an empty screen and three 403s.
 */
export function landingPathFor(role: UserRole | null): string {
  switch (role) {
    case "superadmin":
      return "/storeadmin/finance";
    case "artist":
      return "/storeadmin/appointments";
    default:
      return "/storeadmin";
  }
}
