/**
 * Strip em dashes (—) and en dashes (–) from admin-entered content as a safety net
 * so new blog posts, events, and product copy stay free of them. A spaced em dash
 * " — " becomes a comma ", "; any remaining em/en dash collapses to a hyphen "-".
 *
 * Mirrors the one-off cleanup in supabase/migrations/website_strip_em_dashes.sql.
 */
export function stripDashes<T extends string | null | undefined>(value: T): T {
  if (typeof value !== "string") return value
  return value
    .replace(/ — /g, ", ")
    .replace(/—/g, "-")
    .replace(/–/g, "-") as T
}
