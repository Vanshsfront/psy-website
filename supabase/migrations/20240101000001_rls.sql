-- Migration file: 20240101000001_rls.sql
-- Enable Row Level Security (RLS) on all tables

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 1. admin_users
-- Only admins can read/write admins (assuming admin session check based on JWT or service role)
-- For this Next.js app, admin auth uses NextAuth, so Supabase will be accessed via a Service Role Key
-- Service Role bypasses RLS, so we can basically deny all public access.
CREATE POLICY "Deny all public access to admin_users" ON admin_users FOR ALL USING (false);

-- 2. artists (Public can read, Admin can write via Service Role)
CREATE POLICY "Public read access to artists" ON artists FOR SELECT USING (true);

-- 3. styles (Public can read, Admin can write)
CREATE POLICY "Public read access to styles" ON styles FOR SELECT USING (true);

-- 4. portfolio_items (Public can read, Admin can write)
CREATE POLICY "Public read access to portfolio_items" ON portfolio_items FOR SELECT USING (true);

-- 5. products (Public can read, Admin can write)
CREATE POLICY "Public read access to products" ON products FOR SELECT USING (true);

-- 6. bookings (Public can insert, Admin can read/update)
CREATE POLICY "Public can insert bookings" ON bookings FOR INSERT WITH CHECK (true);
-- Note: Public cannot select bookings, ensuring privacy. Admins read them via Service Role Key.

-- 7. orders (Public can insert, Public can read their own if authenticated [skip for now since guest checkout], Admin can read/update)
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
-- To allow order confirmation page reading, allow select based on ID matching or just rely on Service Role for fetching confirm page safely via Server Action.
CREATE POLICY "Allow read access to orders by ID" ON orders FOR SELECT USING (true);
