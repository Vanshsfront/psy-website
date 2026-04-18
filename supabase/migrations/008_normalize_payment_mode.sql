-- One-shot normalization: lowercase payment_mode values across orders and expenses
-- so facet filters don't see duplicate buckets like "UPI" and "upi" as distinct values.

UPDATE orders
SET payment_mode = LOWER(payment_mode)
WHERE payment_mode IS NOT NULL
  AND payment_mode <> LOWER(payment_mode);

UPDATE expenses
SET payment_mode = LOWER(payment_mode)
WHERE payment_mode IS NOT NULL
  AND payment_mode <> LOWER(payment_mode);
