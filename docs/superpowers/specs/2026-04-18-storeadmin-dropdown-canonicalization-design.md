# Storeadmin Dropdown Canonicalization

**Date:** 2026-04-18
**Status:** Approved (design)
**Scope:** `/storeadmin` only. Touches the storeadmin Supabase project (`thfkielcfagqfkmuzofa`), not the public site / storefront DB.

## Problem

Filter dropdowns in `/storeadmin` show duplicate options that are semantically the same value typed differently — e.g. `Cash` / `cash`, `Card` / `card`, `Walk - in` / `walk-in`, `Reference` / `referral`. The duplicates appear because:

1. Some entry forms use mixed-case option values (`UPI` capital vs `cash` lower).
2. Older legacy rows pre-date the current dropdowns and contain free-form text.
3. Auto-generated facet filters in `DataTable` and the expenses page bucket by exact string match, so any case or punctuation difference becomes a separate filter chip.

Live distinct values (queried 2026-04-18):

| Column | Distinct values | Top duplicates |
|---|---|---|
| `orders.payment_mode` | 6 | `UPI`/`upi` (1333/0), `Cash`/`cash` (582/5), `Card`/`card` (30/2) |
| `orders.source` | 11 (+ 1462 nulls) | `Walk - in`/`walk-in` (145/105), `Reference`/`referral` (87/73), `Google`/`google` (15/4), `Instagram`/`instagram` (10/5) |
| `customers.source` | 11 | Same shape as `orders.source` |
| `expenses.category` | 3 | Mostly `other` (417); not a duplicates problem |
| `expenses.payment_mode` | 3 | Mostly null (415); too sparse to bother |

## Goal

Eliminate duplicate dropdown options for `payment_mode` and `source` by:

1. Establishing a canonical option list per field (single source of truth).
2. Backfilling existing rows so each canonical value has exactly one representation in the DB.
3. Locking entry at every form so new bad values cannot be created.

## Non-goals

- `expenses.category` — only one duplicate-y value exists; the real issue is the OCR/LLM tagging everything as `other`. Out of scope; address separately.
- `expenses.payment_mode` — too sparse to warrant a backfill now.
- `appointment_type` — not a DB column. The new-order form prepends it to `service_description` text. Restructuring is a separate project.
- The website / storefront DB — different Supabase project, not touched.
- Any UI-only "case-insensitive grouping" hacks — we're fixing the data, so the UI doesn't need to compensate.

## Design

### §1 — Canonical lists (single source of truth)

New file: `lib/storeadmin/enums.ts`.

```ts
export type EnumOption = { value: string; label: string };

export const PAYMENT_MODES: readonly EnumOption[] = [
  { value: "cash", label: "Cash" },
  { value: "upi",  label: "UPI"  },
  { value: "card", label: "Card" },
] as const;

export const ORDER_SOURCES: readonly EnumOption[] = [
  { value: "walk_in",    label: "Walk-in"    },
  { value: "referral",   label: "Referral"   },
  { value: "old_client", label: "Old Client" },
  { value: "instagram",  label: "Instagram"  },
  { value: "google",     label: "Google"     },
] as const;

// Per-field alias map: any historical raw value → canonical value.
// Used by both the migration generator and the server-side normalize() helper.
export const PAYMENT_MODE_ALIASES: Record<string, string> = {
  // case folding handled below; explicit aliases only when needed
};

export const SOURCE_ALIASES: Record<string, string> = {
  "walk - in": "walk_in",
  "walk-in": "walk_in",
  "reference": "referral",
  "referral": "referral",
  "friends / family": "referral",
  "old client": "old_client",
  "google": "google",
  "instagram": "instagram",
};

export function labelFor(list: readonly EnumOption[], value: string | null | undefined): string {
  if (!value) return "—";
  return list.find(o => o.value === value)?.label ?? value;
}

// Coerce raw input → canonical value. Returns null for unknown/empty.
export function normalize(
  list: readonly EnumOption[],
  aliases: Record<string, string>,
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const k = raw.trim().toLowerCase();
  if (!k) return null;
  if (aliases[k]) return aliases[k];
  if (list.some(o => o.value === k)) return k;
  return null;
}
```

**Storage convention:** DB stores `value` (lowercase snake_case). UI renders `label`. Empty / null is the canonical "no value" state — there is no `other` enum value.

### §2 — One-time SQL backfill migration

**Migration tooling note.** The existing `supabase/migrations/` folder targets the **website** Supabase project (init, RLS, storage policies, ecommerce schemas). It is not wired up to the storeadmin DB — evidence: `008_normalize_payment_mode.sql` already does the exact `LOWER(payment_mode)` fix for `orders` and `expenses`, yet the storeadmin DB still contains 1333 `UPI` and 582 `Cash` rows. So `supabase/migrations/` was either run only against the website DB or not at all against storeadmin.

To keep storeadmin migrations distinct and discoverable:

- New folder: `supabase/storeadmin-migrations/`.
- New file: `supabase/storeadmin-migrations/001_normalize_dropdown_values.sql`.
- README in that folder explains: these are run **manually** against the storeadmin Supabase project via its SQL editor (or via psql with the storeadmin DB URL). They are checked into git for history but there is no auto-runner.

The migration itself, wrapped in a single transaction:

```sql
BEGIN;

-- 1. orders.payment_mode: pure case-folding
UPDATE orders
   SET payment_mode = lower(payment_mode)
 WHERE payment_mode IS NOT NULL
   AND payment_mode <> lower(payment_mode);

-- 2. orders.source: alias mapping
WITH mapping(raw, canon) AS (VALUES
  ('Walk - in',         'walk_in'),
  ('walk-in',           'walk_in'),
  ('Reference',         'referral'),
  ('referral',          'referral'),
  ('Friends / Family',  'referral'),
  ('old client',        'old_client'),
  ('Google',            'google'),
  ('google',            'google'),
  ('Instagram',         'instagram'),
  ('instagram',         'instagram')
)
UPDATE orders o
   SET source = m.canon
  FROM mapping m
 WHERE o.source = m.raw;

-- 3. orders.source: empty string → NULL
UPDATE orders SET source = NULL WHERE source = '';

-- 4. customers.source: same mapping as orders.source
WITH mapping(raw, canon) AS (VALUES
  ('Walk - in',         'walk_in'),
  ('walk-in',           'walk_in'),
  ('Reference',         'referral'),
  ('referral',          'referral'),
  ('Friends / Family',  'referral'),
  ('old client',        'old_client'),
  ('Google',            'google'),
  ('google',            'google'),
  ('Instagram',         'instagram'),
  ('instagram',         'instagram')
)
UPDATE customers c
   SET source = m.canon
  FROM mapping m
 WHERE c.source = m.raw;

UPDATE customers SET source = NULL WHERE source = '';

-- 5. Verification: surface any non-canonical residue.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT 'orders.payment_mode' AS col, payment_mode AS val, count(*) AS n
      FROM orders
     WHERE payment_mode IS NOT NULL
       AND payment_mode NOT IN ('cash','upi','card')
     GROUP BY payment_mode
    UNION ALL
    SELECT 'orders.source', source, count(*)
      FROM orders
     WHERE source IS NOT NULL
       AND source NOT IN ('walk_in','referral','old_client','instagram','google')
     GROUP BY source
    UNION ALL
    SELECT 'customers.source', source, count(*)
      FROM customers
     WHERE source IS NOT NULL
       AND source NOT IN ('walk_in','referral','old_client','instagram','google')
     GROUP BY source
  LOOP
    RAISE NOTICE 'NON-CANONICAL %: % rows have value %', r.col, r.n, r.val;
  END LOOP;
END $$;

COMMIT;
```

**Guardrails:**

- `expenses.category = 'topup'` is the petty-cash sentinel and is not touched (we don't update the `expenses` table at all in this migration).
- Any value not in the alias mapping is **left as-is** (not blanket-nulled). The `RAISE NOTICE` block surfaces them so we can decide manually.
- Migration runs in a transaction, so a failure rolls everything back.

**Pre-flight dry-run:** before applying, run a `SELECT` version of the same mapping locally and report the row-count delta to the user for approval. This is a separate read-only script, not part of the committed migration.

### §3 — Lock entry at form layer

Files to update — all three replace hardcoded `<option>` lists with `.map()` over the enums file:

1. **`app/storeadmin/orders/new/page.tsx`** — fixes the `"UPI"` vs `"cash"` casing inconsistency that was minting new mixed-case rows. Also generates the `source` select from `ORDER_SOURCES`.
2. **`components/storeadmin/OrderEditDrawer.tsx`** — payment mode + source selects.
3. **`components/storeadmin/CustomerEditDrawer.tsx`** — source select.

Server-side defence in depth — `lib/storeadmin/server/database.ts`:

- `createOrder` already lowercases `payment_mode`. Extend it to also `normalize(ORDER_SOURCES, SOURCE_ALIASES, source)`.
- `updateOrder` ditto.
- `createCustomer` and `updateCustomer` get the same `normalize(...)` call applied to `source`.

Why both UI lock + server normalize: the server is the only place every write path passes through (manual forms, OCR intake, future imports), so it's the real backstop. The UI changes prevent users from creating ambiguous values in the first place.

### §4 — Dropdown filter behaviour (no changes needed)

After the backfill:

- `DataTable`'s `facetCounts` (orders page payment / source / artist filters) auto-generates from the now-clean distinct values. **No code change.**
- The finance page's `paymentBreakdown` buckets by `payment_mode` and will collapse correctly. **No code change.**
- The expenses page builds its own category chip list — but expenses are out of scope, so it's left as-is.

This is the payoff for choosing the data-normalize approach over UI-dedupe: the UI gets simpler for free.

## Data flow

```
                      ┌──────────────────────┐
   manual entry ──┐   │                      │
   OCR intake ────┼──▶│ lib/storeadmin/      │──▶ DB (canonical)
   API route ─────┘   │   server/database.ts │
                      │   normalize() applied │
                      └──────────────────────┘
                                  │
                                  ▼
                         enums.ts (single
                         source of truth)
                                  ▲
                                  │
   New-order form  ─────┐         │
   OrderEditDrawer  ────┼────.map(o => <option>)
   CustomerEditDrawer ──┘
```

## Testing / verification

- After running the migration, re-run the distinct-values query (the same `/tmp/query-distinct.mjs` script that produced the table in this spec) and confirm:
  - `orders.payment_mode` has only `cash`, `upi`, `card`, plus null.
  - `orders.source` has only `walk_in`, `referral`, `old_client`, `instagram`, `google`, plus null.
  - `customers.source` has the same set.
- Open `/storeadmin/orders` and confirm the payment / source filter dropdowns each show one entry per canonical value.
- Open `/storeadmin/orders/new`, create an order, and confirm the new row has lowercase canonical values.
- Open `/storeadmin/finance` and confirm payment-method bucket no longer splits Cash / cash.

## Risks

- **Unknown legacy values.** If the live data contains values we didn't see in the snapshot (e.g. typos in fewer than the page-size of rows), they'll be preserved by the migration. The `RAISE NOTICE` block surfaces them. Mitigation: review the notice output and decide per-value.
- **Concurrent writes during migration.** The transaction holds row-level locks on `orders` and `customers`. The storeadmin DB is small (~2k orders, ~1k customers); the migration should complete in well under a second. No special downtime needed.
- **Forms missed.** If there's an entry path not listed in §3, it could keep writing bad values. The server-side `normalize()` in `database.ts` is the backstop — every documented write path goes through those functions.

## Rollout

1. Land enums.ts + form changes + server-side `normalize()` in one PR.
2. Run the dry-run `SELECT` script against storeadmin DB and review row-count diff with user.
3. Apply the migration manually via the storeadmin Supabase SQL editor (paste the file). Capture `RAISE NOTICE` output.
4. Re-run distinct-values query to verify the canonical-only state.
5. Commit the migration file under `supabase/storeadmin-migrations/` for history.

## Open questions

- Should the storeadmin migrations folder eventually get a runner script (e.g. `npm run storeadmin:migrate` that pipes files into psql)? Out of scope for this spec; flag for a future project if storeadmin migrations become more frequent.
