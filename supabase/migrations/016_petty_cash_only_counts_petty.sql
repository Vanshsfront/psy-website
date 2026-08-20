-- Migration 016: the petty cash float only moves on petty cash spending.
--
-- Yogesh, 2026-08-20: "business expenses logged are being deducted from petty
-- cash, can you please streamline this?"
--
-- The balance was topups minus EVERY expense row, so a bill paid by bank
-- transfer, UPI or card reduced the cash in the tin, which is not something
-- that can physically happen. From now on only rows marked `petty` reduce it.
--
-- That rule needs the existing rows to be classified, and they are not: the
-- `expense_type` column arrived in migration 012 with a default of 'business',
-- so 472 rows recorded before anyone could choose read as business today even
-- though every one of them was deducted from the float.
--
-- The backfill uses the only evidence in the data: how it was paid. Cash left
-- the tin, so those rows become 'petty' and keep behaving exactly as they did.
-- Anything paid by UPI, card, bank transfer or "other" did not, so it stays
-- 'business' and stops being deducted. The balance moves up by the sum of those
-- non-cash rows, which is the correction being asked for, not a side effect.
--
-- Payment mode is stored inconsistently ("cash" vs "Cash"), hence the ILIKE.

UPDATE studio.expenses
   SET expense_type = 'petty'
 WHERE category <> 'topup'
   AND expense_type <> 'petty'
   AND payment_mode ILIKE 'cash';

-- Top-ups are float movements. Migration 012 set the ones that existed then;
-- any recorded since were inserted without the column and took the default.
UPDATE studio.expenses
   SET expense_type = 'petty'
 WHERE category = 'topup'
   AND expense_type <> 'petty';

-- The balance and the top-up log both read this pair.
CREATE INDEX IF NOT EXISTS expenses_category_type_idx
  ON studio.expenses (category, expense_type);
