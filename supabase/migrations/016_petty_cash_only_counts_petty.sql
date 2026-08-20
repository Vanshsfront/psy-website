-- Migration 016: the petty cash float only moves on petty cash spending.
--
-- Yogesh, 2026-08-20: "business expenses logged are being deducted from petty
-- cash, can you please streamline this?"
--
-- The balance was topups minus EVERY expense row, so a bill paid by bank
-- transfer or UPI reduced the cash in the tin, which is not something that can
-- physically happen. From now on only rows marked `petty` reduce it.
--
-- That rule needs the existing rows classified, and they are not: `expense_type`
-- arrived in migration 012 with a default of 'business', so nearly every row
-- reads as business today even though every one of them was being deducted.
--
-- What is actually in the table (2026-08-20, 493 rows):
--
--   topup? type      payment_mode   rows      amount
--   ----------------------------------------------------
--   no     business   cash            48   13,046.97
--   no     business   (empty)        415   44,549.00
--   no     business   unknown          6    7,441.00
--   no     business   upi              2    8,100.00
--   no     petty      cash             1      230.00
--   yes    petty      cash            19   66,247.00
--   yes    business   cash             2    8,100.00
--
-- Balance before this migration: 74,347 - 73,367 = 980.
--
-- The 415 rows with no payment mode at all are the legacy import from the
-- WhatsApp group, and they are the bulk of the money. Classifying only the rows
-- that literally say "cash" would strand them as business and jump the balance
-- to about 61,000, which is nonsense. So the rule is the other way round: a row
-- stays business only where it says it was paid by something that cannot come
-- out of a tin. Everything else keeps behaving exactly as it always has.
--
-- Here that leaves the two UPI rows, 8,100 of salary, and the balance moves
-- 980 -> 9,080. That single correction is what was being asked for.
--
-- Payment mode is stored inconsistently ("cash" vs "Cash"), hence the lower().

UPDATE studio.expenses
   SET expense_type = 'petty'
 WHERE category <> 'topup'
   AND expense_type <> 'petty'
   AND lower(trim(coalesce(payment_mode, ''))) NOT IN
       ('upi', 'card', 'bank_transfer', 'bank transfer', 'netbanking', 'cheque', 'online');

-- Top-ups are float movements, counted as money in rather than money out.
-- Migration 012 set the ones that existed then; two recorded since were
-- inserted without the column and took the 'business' default.
UPDATE studio.expenses
   SET expense_type = 'petty'
 WHERE category = 'topup'
   AND expense_type <> 'petty';

-- The balance and the top-up log both read this pair.
CREATE INDEX IF NOT EXISTS expenses_category_type_idx
  ON studio.expenses (category, expense_type);
