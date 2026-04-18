-- One-shot normalization: lowercase payment_mode values so facet filters
-- don't see duplicate buckets like "UPI" and "upi" as distinct values.
-- Guarded with information_schema checks: skips a table if the column is
-- missing (e.g. expenses.payment_mode may not exist in some deployments).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'payment_mode'
  ) THEN
    UPDATE orders
    SET payment_mode = LOWER(payment_mode)
    WHERE payment_mode IS NOT NULL
      AND payment_mode <> LOWER(payment_mode);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'expenses'
      AND column_name = 'payment_mode'
  ) THEN
    UPDATE expenses
    SET payment_mode = LOWER(payment_mode)
    WHERE payment_mode IS NOT NULL
      AND payment_mode <> LOWER(payment_mode);
  END IF;
END $$;
