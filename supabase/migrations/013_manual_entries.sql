-- Migration 013: hand-entered lines on the salary slips and the balance sheet
--
-- Yogesh, 2026-08-19: "its not set in stone, i do add bonuses as well time and
-- again. So can you also keep the option to add additional fields (admin access
-- only) for both salary slips and the balancesheet. I will have to add expenses,
-- incomes beyond what reflects dynamically as well"
--
-- Both screens compute from orders and expenses, and both need lines that are
-- not derivable from them: a one-off bonus, a cash expense nobody logged, income
-- from outside the order flow. The two needs are the same shape, a dated and
-- labelled signed amount attached to something, so they share one table rather
-- than two that would drift apart.
--
-- SIGN CONVENTION: `amount` is signed and always added. A bonus or an income is
-- positive, a deduction or an expense is negative. Storing a magnitude plus a
-- direction invites the bug where the two disagree, so the sign is the single
-- source of truth and `kind` is only a label for how it is displayed and
-- grouped.
--
-- These change what people are paid, so every row records who wrote it and
-- deletion is soft. Nothing is ever silently removed from a pay calculation.

CREATE TABLE IF NOT EXISTS studio.manual_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which screen the line belongs to.
  scope       text NOT NULL CHECK (scope IN ('salary', 'balance_sheet')),

  -- Whose slip. Required for salary lines, forbidden on balance sheet lines.
  artist_id   uuid REFERENCES studio.artists(id) ON DELETE CASCADE,

  -- The line lands in the month containing this date, matching how both screens
  -- already window their figures.
  entry_date  date NOT NULL,

  label       text NOT NULL,
  amount      numeric NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('bonus', 'deduction', 'income', 'expense')),
  notes       text,

  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  is_deleted  boolean NOT NULL DEFAULT false,
  deleted_at  timestamptz,
  deleted_by  text,

  -- A salary line without an artist would belong to nobody and quietly never be
  -- paid; a balance sheet line with one would imply a person's slip it is not on.
  CONSTRAINT manual_entries_scope_artist_check
    CHECK ((scope = 'salary') = (artist_id IS NOT NULL)),

  -- Keep the labels honest about which screen they are for.
  CONSTRAINT manual_entries_kind_scope_check
    CHECK (
      (scope = 'salary'        AND kind IN ('bonus', 'deduction')) OR
      (scope = 'balance_sheet' AND kind IN ('income', 'expense'))
    )
);

CREATE INDEX IF NOT EXISTS manual_entries_scope_date_idx
  ON studio.manual_entries (scope, entry_date);
CREATE INDEX IF NOT EXISTS manual_entries_artist_idx
  ON studio.manual_entries (artist_id, entry_date);

-- Same trigger the other studio tables use to keep updated_at honest.
DROP TRIGGER IF EXISTS manual_entries_touch ON studio.manual_entries;
CREATE TRIGGER manual_entries_touch
  BEFORE UPDATE ON studio.manual_entries
  FOR EACH ROW EXECUTE FUNCTION studio.touch_updated_at();

ALTER TABLE studio.manual_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role full access manual_entries" ON studio.manual_entries;
CREATE POLICY "service role full access manual_entries"
  ON studio.manual_entries
  TO service_role
  USING (true)
  WITH CHECK (true);
