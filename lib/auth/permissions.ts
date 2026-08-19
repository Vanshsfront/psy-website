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
 * Copy shown in the Logins screen. Kept here so the words people read and the
 * access they actually get are defined in the same place.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Owner, full access including finance",
  admin: "Manager, everything except finance and logins",
  artist: "Artist, only their own appointments and earnings",
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
export const API_ACCESS: ReadonlyArray<{ prefix: string; roles: readonly UserRole[] | null }> = [
  // Public by necessity.
  { prefix: "/api/storeadmin/auth/login", roles: null }, // issues the session
  { prefix: "/api/storeadmin/auth/logout", roles: null }, // must work on a dead session
  { prefix: "/api/storeadmin/auth/me", roles: null }, // authenticated, but every role may ask who it is
  { prefix: "/api/storeadmin/health", roles: null }, // uptime probe
  { prefix: "/api/storeadmin/whatsapp/webhook", roles: null }, // Meta callback, verified by signature

  // Owner only.
  { prefix: "/api/storeadmin/users", roles: OWNER },
  { prefix: "/api/storeadmin/finance", roles: OWNER },
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
  { prefix: "/api/storeadmin/orders", roles: STAFF },
  { prefix: "/api/storeadmin/petty-cash", roles: STAFF },
  { prefix: "/api/storeadmin/whatsapp/templates", roles: STAFF },
];

/**
 * Roles that see only their own records rather than the whole studio's.
 *
 * Scoping is applied inside the query, never by filtering results afterwards,
 * so it cannot be widened by editing a request. Today it exists for
 * appointments only; every other route excludes artists outright.
 */
export const OWN_RECORDS_ONLY: readonly UserRole[] = ["artist"];

/** Resolve the roles allowed on a path. `null` means the route self-authenticates. */
export function accessForPath(pathname: string): readonly UserRole[] | null | undefined {
  let best: { prefix: string; roles: readonly UserRole[] | null } | undefined;
  for (const entry of API_ACCESS) {
    if (!pathname.startsWith(entry.prefix)) continue;
    if (!best || entry.prefix.length > best.prefix.length) best = entry;
  }
  return best?.roles;
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
  "/storeadmin/orders": STAFF,
  "/storeadmin/orders/new": STAFF,
  "/storeadmin/artists": STAFF,
  "/storeadmin/campaigns": STAFF,
  "/storeadmin/expenses": STAFF,
  "/storeadmin/appointments": ALL_ROLES,
  "/storeadmin/finance": OWNER,
  "/storeadmin/balance-sheet": OWNER,
  "/storeadmin/users": OWNER,
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
