-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 005 — Orders: Production-Ready Enhancements
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- 2. Auto-update updated_at trigger for orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Sequence for human-readable order numbers (PSY-0001, PSY-0002, etc.)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- 4. Auto-generate order_number on insert
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number = 'PSY-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- 5. Backfill existing orders with order numbers (if any exist)
UPDATE orders 
SET order_number = 'PSY-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0')
WHERE order_number IS NULL;

-- 6. Add RLS policy for service-role updates on orders
-- (Service role bypasses RLS anyway, but this makes intent explicit for anon clients)
DROP POLICY IF EXISTS "Allow update on orders" ON orders;
CREATE POLICY "Allow update on orders"
  ON orders FOR UPDATE USING (true) WITH CHECK (true);
