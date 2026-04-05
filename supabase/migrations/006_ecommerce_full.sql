-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 006 — Full-Featured Ecommerce Enhancements
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. INVENTORY: Add stock_quantity to products
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

-- ──────────────────────────────────────────────────────────────────────
-- 2. PRODUCT VARIANTS (relational, replaces JSONB variants column)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  label TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_override NUMERIC(10, 2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────────────
-- 3. COLLECTIONS
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- ──────────────────────────────────────────────────────────────────────
-- 4. DISCOUNTS / COUPONS
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add discount columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

-- ──────────────────────────────────────────────────────────────────────
-- 5. CUSTOMER ACCOUNTS
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_shop_customers_updated_at
  BEFORE UPDATE ON shop_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES shop_customers(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Link orders to customer accounts (nullable for guest checkout)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES shop_customers(id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- ──────────────────────────────────────────────────────────────────────
-- 6. RETURN REQUESTS
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID REFERENCES shop_customers(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  refund_amount NUMERIC(10, 2),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);

CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────────────
-- 7. RLS POLICIES
-- ──────────────────────────────────────────────────────────────────────

-- Collections: public read
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read collections" ON collections;
CREATE POLICY "Public read collections" ON collections FOR SELECT USING (true);

-- Collection products: public read
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read collection_products" ON collection_products;
CREATE POLICY "Public read collection_products" ON collection_products FOR SELECT USING (true);

-- Product variants: public read
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product_variants" ON product_variants;
CREATE POLICY "Public read product_variants" ON product_variants FOR SELECT USING (true);

-- Discounts: public read for active ones (needed for validation)
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active discounts" ON discounts;
CREATE POLICY "Public read active discounts" ON discounts FOR SELECT USING (is_active = true);

-- Shop customers: no public access (service role only)
ALTER TABLE shop_customers ENABLE ROW LEVEL SECURITY;

-- Customer addresses: no public access (service role only)
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- Return requests: no public access (service role only)
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
