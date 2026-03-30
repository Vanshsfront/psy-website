-- =================================================================
-- Psy Tattoos — Complete Database Setup
-- Paste this entire file into: Supabase Dashboard > SQL Editor > Run
--
-- Covers: Schema, RLS Policies, Storage Policies, Seed Data
--
-- Admin login after running:
--   Username : admin
--   Password : admin@psy123
-- =================================================================


-- ═════════════════════════════════════════════════════════════════
-- SECTION 1 — SCHEMA
-- ═════════════════════════════════════════════════════════════════

-- 1. admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. artists
CREATE TABLE IF NOT EXISTS artists (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE NOT NULL,
  bio               TEXT,
  speciality        TEXT,
  instagram         TEXT,
  profile_photo_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. styles
CREATE TABLE IF NOT EXISTS styles (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT    NOT NULL,
  description       TEXT,
  starting_price    NUMERIC(10, 2),
  example_image_url TEXT
);

-- 4. portfolio_items
CREATE TABLE IF NOT EXISTS portfolio_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT        NOT NULL,
  artist_id   UUID        REFERENCES artists(id) ON DELETE SET NULL,
  style_tag   TEXT,
  description TEXT,
  featured    BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. bookings
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  phone               TEXT,
  artist_id           UUID        REFERENCES artists(id) ON DELETE SET NULL,
  style               TEXT,
  description         TEXT,
  preferred_date      TIMESTAMPTZ,
  reference_image_url TEXT,
  status              TEXT        DEFAULT 'pending', -- pending | confirmed | completed | cancelled
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 6. products
CREATE TABLE IF NOT EXISTS products (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE NOT NULL,
  description_short TEXT,
  description_full  TEXT,
  category          TEXT        NOT NULL,
  price             NUMERIC(10, 2) NOT NULL,
  compare_at_price  NUMERIC(10, 2),
  material          TEXT,
  tags              TEXT[]      DEFAULT '{}',
  images            TEXT[]      DEFAULT '{}',
  variants          JSONB       DEFAULT '[]'::jsonb,
  stock_status      BOOLEAN     DEFAULT true,
  is_featured       BOOLEAN     DEFAULT false,
  is_deleted        BOOLEAN     DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. orders
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        TEXT        UNIQUE,
  customer_name       TEXT        NOT NULL,
  customer_email      TEXT        NOT NULL,
  customer_phone      TEXT,
  shipping_address    JSONB       NOT NULL,
  items               JSONB       NOT NULL,
  subtotal            NUMERIC(10, 2) NOT NULL,
  shipping            NUMERIC(10, 2) NOT NULL,
  total               NUMERIC(10, 2) NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  status              TEXT        DEFAULT 'pending', -- pending | paid | shipped | delivered | refunded
  tracking_number     TEXT,
  courier_name        TEXT,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- auto-update updated_at on products & orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order number auto-generation (PSY-0001, PSY-0002, etc.)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

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


-- ═════════════════════════════════════════════════════════════════
-- SECTION 2 — ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════

ALTER TABLE admin_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;

-- admin_users: deny all public access (service role bypasses RLS)
DROP POLICY IF EXISTS "Deny all public access to admin_users" ON admin_users;
CREATE POLICY "Deny all public access to admin_users"
  ON admin_users FOR ALL USING (false);

-- artists, styles, portfolio_items, products: public read
DROP POLICY IF EXISTS "Public read access to artists" ON artists;
CREATE POLICY "Public read access to artists"
  ON artists FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to styles" ON styles;
CREATE POLICY "Public read access to styles"
  ON styles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to portfolio_items" ON portfolio_items;
CREATE POLICY "Public read access to portfolio_items"
  ON portfolio_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to products" ON products;
CREATE POLICY "Public read access to products"
  ON products FOR SELECT USING (true);

-- bookings: public can insert (booking form), admin reads via service role
DROP POLICY IF EXISTS "Public can insert bookings" ON bookings;
CREATE POLICY "Public can insert bookings"
  ON bookings FOR INSERT WITH CHECK (true);

-- orders: public can insert (checkout), public can read (order confirmation)
DROP POLICY IF EXISTS "Public can insert orders" ON orders;
CREATE POLICY "Public can insert orders"
  ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access to orders by ID" ON orders;
CREATE POLICY "Allow read access to orders by ID"
  ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update on orders" ON orders;
CREATE POLICY "Allow update on orders"
  ON orders FOR UPDATE USING (true) WITH CHECK (true);


-- ═════════════════════════════════════════════════════════════════
-- SECTION 3 — STORAGE BUCKETS & POLICIES
-- ═════════════════════════════════════════════════════════════════

-- Create public buckets (safe to re-run)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-images', 'product-images', true),
  ('portfolio',      'portfolio',      true),
  ('artist-photos',  'artist-photos',  true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies before recreating
DROP POLICY IF EXISTS "Public read access for product-images"  ON storage.objects;
DROP POLICY IF EXISTS "Admin insert access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for portfolio"       ON storage.objects;
DROP POLICY IF EXISTS "Admin insert access for portfolio"      ON storage.objects;
DROP POLICY IF EXISTS "Admin update access for portfolio"      ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access for portfolio"      ON storage.objects;
DROP POLICY IF EXISTS "Public read access for artist-photos"   ON storage.objects;
DROP POLICY IF EXISTS "Admin insert access for artist-photos"  ON storage.objects;
DROP POLICY IF EXISTS "Admin update access for artist-photos"  ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access for artist-photos"  ON storage.objects;

-- product-images
CREATE POLICY "Public read access for product-images"  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin insert access for product-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Admin update access for product-images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
CREATE POLICY "Admin delete access for product-images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- portfolio
CREATE POLICY "Public read access for portfolio"  ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Admin insert access for portfolio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio');
CREATE POLICY "Admin update access for portfolio" ON storage.objects FOR UPDATE USING (bucket_id = 'portfolio');
CREATE POLICY "Admin delete access for portfolio" ON storage.objects FOR DELETE USING (bucket_id = 'portfolio');

-- artist-photos
CREATE POLICY "Public read access for artist-photos"  ON storage.objects FOR SELECT USING (bucket_id = 'artist-photos');
CREATE POLICY "Admin insert access for artist-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artist-photos');
CREATE POLICY "Admin update access for artist-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'artist-photos');
CREATE POLICY "Admin delete access for artist-photos" ON storage.objects FOR DELETE USING (bucket_id = 'artist-photos');


-- ═════════════════════════════════════════════════════════════════
-- SECTION 4 — SEED DATA
-- ═════════════════════════════════════════════════════════════════

-- ── Admin User ───────────────────────────────────────────────────
-- Password: admin@psy123  (bcrypt, cost=12)
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2b$12$DH2S6a4oNrsELUaoo4/8o.mPBMx15qeJ6mHqRflCmkGvXZv6P9vmW')
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash;

-- ── Artists ──────────────────────────────────────────────────────
INSERT INTO artists (name, slug, bio, speciality, instagram)
VALUES
  ('Aryan Mehta',  'aryan-mehta',  'Specializing in fine-line and geometric tattoos with 8 years of experience. Every line tells a story.', 'Fine Line & Geometric',    'aryan.ink'),
  ('Priya Sharma', 'priya-sharma', 'A lover of botanical and blackwork tattoos. Nature-inspired art meets precision inkwork.',               'Botanical & Blackwork',    'priya.tattoos'),
  ('Karan Dutt',   'karan-dutt',   'Neo-traditional and Japanese style artist bringing vibrant, story-driven pieces to life.',               'Neo-Traditional & Japanese','karan.dutt.ink')
ON CONFLICT (slug) DO UPDATE
  SET bio = EXCLUDED.bio, speciality = EXCLUDED.speciality, instagram = EXCLUDED.instagram;

-- ── Styles ───────────────────────────────────────────────────────
DELETE FROM styles;
INSERT INTO styles (name, description, starting_price) VALUES
  ('Fine Line',          'Delicate, precise linework creating elegant minimalist tattoos. Perfect for subtle, sophisticated designs.', 3500),
  ('Blackwork',          'Bold black ink work ranging from geometric patterns to intricate illustrative pieces.',                     4000),
  ('Neo-Traditional',    'A modern take on classic tattooing with bold lines, vivid colours and intricate details.',                 6000),
  ('Japanese (Irezumi)', 'Traditional Japanese motifs — koi, cherry blossoms, dragons — rendered in the classical style.',          8000);

-- ── Portfolio Items ──────────────────────────────────────────────
DELETE FROM portfolio_items;
INSERT INTO portfolio_items (image_url, artist_id, style_tag, description)
SELECT url, a.id, tag, descr FROM (VALUES
  ('https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800', 'aryan-mehta',  'Fine Line',       'Minimalist mountain range on forearm'),
  ('https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800',    'aryan-mehta',  'Geometric',       'Sacred geometry mandala on shoulder'),
  ('https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800',    'priya-sharma', 'Blackwork',       'Botanical sleeve — rose & fern'),
  ('https://images.unsplash.com/photo-1575369422539-f2b8b3e0ee5c?w=800', 'priya-sharma', 'Blackwork',       'Intricate moth with moon phase'),
  ('https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800', 'karan-dutt',   'Neo-Traditional', 'Neo-trad wolf with floral surround'),
  ('https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800', 'karan-dutt',   'Japanese',        'Koi fish with cherry blossoms — half sleeve'),
  ('https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',    'aryan-mehta',  'Fine Line',       'Celestial fine-line constellation on wrist'),
  ('https://images.unsplash.com/photo-1590246814883-57c511e76d1a?w=800', 'priya-sharma', 'Blackwork',       'Abstract floral blackwork on ribs')
) AS t(url, slug, tag, descr)
JOIN artists a ON a.slug = t.slug;

-- ── Products ─────────────────────────────────────────────────────
INSERT INTO products (name, slug, description_short, description_full, category, price, compare_at_price, material, tags, images, variants, stock_status, is_featured)
VALUES
  (
    'Psy Tattoos Classic Tee', 'psy-tattoos-classic-tee',
    'Premium cotton tee with the Psy Tattoos logo.',
    'Soft, heavyweight 100% organic cotton tee screen-printed with our iconic Psy Tattoos logo. Available in black and white. Unisex fit.',
    'apparel', 999, 1299, '100% Organic Cotton',
    ARRAY['tee','apparel','merch'],
    ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
    '[{"size":"S","stock":10},{"size":"M","stock":15},{"size":"L","stock":12},{"size":"XL","stock":8}]'::jsonb,
    true, true
  ),
  (
    'Ink & Soul Hoodie', 'ink-soul-hoodie',
    'Heavyweight pullover hoodie — stay warm in style.',
    '380gsm fleece pullover hoodie with embroidered Psy Tattoos wordmark on chest. Oversized fit, kangaroo pocket.',
    'apparel', 2499, 2999, '80% Cotton / 20% Polyester',
    ARRAY['hoodie','apparel','merch'],
    ARRAY['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800'],
    '[{"size":"S","stock":5},{"size":"M","stock":8},{"size":"L","stock":10},{"size":"XL","stock":6}]'::jsonb,
    true, true
  ),
  (
    'Tattoo Aftercare Kit', 'tattoo-aftercare-kit',
    'Everything you need to heal your new tattoo perfectly.',
    'Our curated aftercare kit includes fragrance-free moisturiser, healing balm, and a gentle foam cleanser. Dermatologist-approved for fresh ink.',
    'aftercare', 799, NULL, NULL,
    ARRAY['aftercare','healing','care'],
    ARRAY['https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=800'],
    '[]'::jsonb, true, true
  ),
  (
    'Flash Design Print — Set of 3', 'flash-design-print-set-3',
    'A3 giclée prints of exclusive Psy flash designs.',
    'Three A3 giclée art prints featuring original flash tattoo designs by our resident artists. Signed & numbered limited edition of 50.',
    'art', 1499, NULL, '300gsm Fine Art Paper',
    ARRAY['art','print','flash'],
    ARRAY['https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800'],
    '[]'::jsonb, true, false
  ),
  (
    'Psy Enamel Pin Set', 'psy-enamel-pin-set',
    '3-piece hard enamel pin set with gold fill.',
    'Three unique hard enamel pins — skull rose, moon dagger, and celestial eye. Gold metal fill, rubber butterfly clutch.',
    'accessories', 499, 699, 'Hard Enamel, Gold Metal',
    ARRAY['accessories','pins','merch'],
    ARRAY['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
    '[]'::jsonb, true, false
  ),
  (
    'Gift Card', 'gift-card',
    'Give the gift of ink. Valid for any tattoo session or product.',
    'Digital gift cards redeemable for any tattoo session or shop purchase. Valid for 12 months. Delivered instantly by email.',
    'gift', 2000, NULL, NULL,
    ARRAY['gift','voucher'],
    ARRAY['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'],
    '[{"amount":2000,"label":"₹2,000"},{"amount":5000,"label":"₹5,000"},{"amount":10000,"label":"₹10,000"}]'::jsonb,
    true, false
  )
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, description_short = EXCLUDED.description_short,
      description_full = EXCLUDED.description_full, category = EXCLUDED.category,
      price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price,
      material = EXCLUDED.material, tags = EXCLUDED.tags, images = EXCLUDED.images,
      variants = EXCLUDED.variants, stock_status = EXCLUDED.stock_status,
      is_featured = EXCLUDED.is_featured;

-- ── Sample Bookings ──────────────────────────────────────────────
DELETE FROM bookings WHERE email IN ('rohan@example.com', 'meera@example.com');
INSERT INTO bookings (name, email, phone, artist_id, style, description, preferred_date, status, admin_notes)
SELECT t.name, t.email, t.phone, a.id, t.style, t.descr, t.preferred_date, t.status, t.notes FROM (VALUES
  ('Rohan Kapoor', 'rohan@example.com', '9876543210', 'aryan-mehta',  'Fine Line', 'Small wolf head on inner forearm, fine line style.',  NOW() + INTERVAL '7 days',  'pending',   NULL),
  ('Meera Nair',   'meera@example.com', '9123456789', 'priya-sharma', 'Blackwork', 'Botanical half sleeve — roses and ferns, blackwork.', NOW() + INTERVAL '14 days', 'confirmed', 'Deposit received. First session ~3 hrs.')
) AS t(name, email, phone, slug, style, descr, preferred_date, status, notes)
JOIN artists a ON a.slug = t.slug;
