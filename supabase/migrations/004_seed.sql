-- =============================================================
-- Psy Tattoos — Seed Data
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Admin login after running:
--   Username : admin
--   Password : admin@psy123
-- =============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. Admin User
-- ──────────────────────────────────────────────────────────────
INSERT INTO admin_users (username, password_hash)
VALUES (
  'admin',
  '$2b$12$DH2S6a4oNrsELUaoo4/8o.mPBMx15qeJ6mHqRflCmkGvXZv6P9vmW'
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash;


-- ──────────────────────────────────────────────────────────────
-- 2. Artists
-- ──────────────────────────────────────────────────────────────
INSERT INTO artists (name, slug, bio, speciality, instagram)
VALUES
  (
    'Aryan Mehta',
    'aryan-mehta',
    'Specializing in fine-line and geometric tattoos with 8 years of experience. Every line tells a story.',
    'Fine Line & Geometric',
    'aryan.ink'
  ),
  (
    'Priya Sharma',
    'priya-sharma',
    'A lover of botanical and blackwork tattoos. Nature-inspired art meets precision inkwork.',
    'Botanical & Blackwork',
    'priya.tattoos'
  ),
  (
    'Karan Dutt',
    'karan-dutt',
    'Neo-traditional and Japanese style artist bringing vibrant, story-driven pieces to life.',
    'Neo-Traditional & Japanese',
    'karan.dutt.ink'
  )
ON CONFLICT (slug) DO UPDATE
  SET bio       = EXCLUDED.bio,
      speciality = EXCLUDED.speciality,
      instagram  = EXCLUDED.instagram;


-- ──────────────────────────────────────────────────────────────
-- 3. Styles
-- ──────────────────────────────────────────────────────────────
-- No unique constraint on `name`, so truncate + reinsert
DELETE FROM styles;

INSERT INTO styles (name, description, starting_price)
VALUES
  ('Fine Line',         'Delicate, precise linework creating elegant minimalist tattoos. Perfect for subtle, sophisticated designs.',         3500),
  ('Blackwork',         'Bold black ink work ranging from geometric patterns to intricate illustrative pieces.',                             4000),
  ('Neo-Traditional',   'A modern take on classic tattooing with bold lines, vivid colours and intricate details.',                         6000),
  ('Japanese (Irezumi)','Traditional Japanese motifs — koi, cherry blossoms, dragons — rendered in the classical style.',                   8000);


-- ──────────────────────────────────────────────────────────────
-- 4. Portfolio Items  (keyed to artists by slug)
-- ──────────────────────────────────────────────────────────────
DELETE FROM portfolio_items;

INSERT INTO portfolio_items (image_url, artist_id, style_tag, description)
SELECT url, a.id, tag, desc
FROM (VALUES
  ('https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800', 'aryan-mehta',  'Fine Line',       'Minimalist mountain range on forearm'),
  ('https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800',    'aryan-mehta',  'Geometric',       'Sacred geometry mandala on shoulder'),
  ('https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800',    'priya-sharma', 'Blackwork',       'Botanical sleeve — rose & fern'),
  ('https://images.unsplash.com/photo-1575369422539-f2b8b3e0ee5c?w=800', 'priya-sharma', 'Blackwork',       'Intricate moth with moon phase'),
  ('https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800', 'karan-dutt',   'Neo-Traditional', 'Neo-trad wolf with floral surround'),
  ('https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800', 'karan-dutt',   'Japanese',        'Koi fish with cherry blossoms — half sleeve'),
  ('https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',    'aryan-mehta',  'Fine Line',       'Celestial fine-line constellation on wrist'),
  ('https://images.unsplash.com/photo-1590246814883-57c511e76d1a?w=800', 'priya-sharma', 'Blackwork',       'Abstract floral blackwork on ribs')
) AS t(url, slug, tag, desc)
JOIN artists a ON a.slug = t.slug;


-- ──────────────────────────────────────────────────────────────
-- 5. Products
-- ──────────────────────────────────────────────────────────────
INSERT INTO products (name, slug, description_short, description_full, category, price, compare_at_price, material, tags, images, variants, stock_status, is_featured)
VALUES
  (
    'Psy Tattoos Classic Tee',
    'psy-tattoos-classic-tee',
    'Premium cotton tee with the Psy Tattoos logo.',
    'Soft, heavyweight 100% organic cotton tee screen-printed with our iconic Psy Tattoos logo. Available in black and white. Unisex fit.',
    'apparel', 999, 1299, '100% Organic Cotton',
    ARRAY['tee','apparel','merch'],
    ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
    '[{"size":"S","stock":10},{"size":"M","stock":15},{"size":"L","stock":12},{"size":"XL","stock":8}]'::jsonb,
    true, true
  ),
  (
    'Ink & Soul Hoodie',
    'ink-soul-hoodie',
    'Heavyweight pullover hoodie — stay warm in style.',
    '380gsm fleece pullover hoodie with embroidered Psy Tattoos wordmark on chest. Oversized fit, kangaroo pocket.',
    'apparel', 2499, 2999, '80% Cotton / 20% Polyester',
    ARRAY['hoodie','apparel','merch'],
    ARRAY['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800'],
    '[{"size":"S","stock":5},{"size":"M","stock":8},{"size":"L","stock":10},{"size":"XL","stock":6}]'::jsonb,
    true, true
  ),
  (
    'Tattoo Aftercare Kit',
    'tattoo-aftercare-kit',
    'Everything you need to heal your new tattoo perfectly.',
    'Our curated aftercare kit includes fragrance-free moisturiser, healing balm, and a gentle foam cleanser. Dermatologist-approved for fresh ink.',
    'aftercare', 799, NULL, NULL,
    ARRAY['aftercare','healing','care'],
    ARRAY['https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=800'],
    '[]'::jsonb,
    true, true
  ),
  (
    'Flash Design Print — Set of 3',
    'flash-design-print-set-3',
    'A3 giclée prints of exclusive Psy flash designs.',
    'Three A3 giclée art prints featuring original flash tattoo designs by our resident artists. Signed & numbered limited edition of 50.',
    'art', 1499, NULL, '300gsm Fine Art Paper',
    ARRAY['art','print','flash'],
    ARRAY['https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800'],
    '[]'::jsonb,
    true, false
  ),
  (
    'Psy Enamel Pin Set',
    'psy-enamel-pin-set',
    '3-piece hard enamel pin set with gold fill.',
    'Three unique hard enamel pins — skull rose, moon dagger, and celestial eye. Gold metal fill, rubber butterfly clutch.',
    'accessories', 499, 699, 'Hard Enamel, Gold Metal',
    ARRAY['accessories','pins','merch'],
    ARRAY['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'],
    '[]'::jsonb,
    true, false
  ),
  (
    'Gift Card',
    'gift-card',
    'Give the gift of ink. Valid for any tattoo session or product.',
    'Digital gift cards redeemable for any tattoo session or shop purchase. Valid for 12 months. Delivered instantly by email.',
    'gift', 2000, NULL, NULL,
    ARRAY['gift','voucher'],
    ARRAY['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'],
    '[{"amount":2000,"label":"₹2,000"},{"amount":5000,"label":"₹5,000"},{"amount":10000,"label":"₹10,000"}]'::jsonb,
    true, false
  )
ON CONFLICT (slug) DO UPDATE
  SET name              = EXCLUDED.name,
      description_short = EXCLUDED.description_short,
      description_full  = EXCLUDED.description_full,
      category          = EXCLUDED.category,
      price             = EXCLUDED.price,
      compare_at_price  = EXCLUDED.compare_at_price,
      material          = EXCLUDED.material,
      tags              = EXCLUDED.tags,
      images            = EXCLUDED.images,
      variants          = EXCLUDED.variants,
      stock_status      = EXCLUDED.stock_status,
      is_featured       = EXCLUDED.is_featured;


-- ──────────────────────────────────────────────────────────────
-- 6. Sample Bookings
-- ──────────────────────────────────────────────────────────────
DELETE FROM bookings WHERE email IN ('rohan@example.com', 'meera@example.com');

INSERT INTO bookings (name, email, phone, artist_id, style, description, preferred_date, status, admin_notes)
SELECT name, email, phone, a.id, style, description, preferred_date::timestamptz, status, admin_notes
FROM (VALUES
  ('Rohan Kapoor', 'rohan@example.com', '9876543210', 'aryan-mehta',  'Fine Line', 'Small wolf head on inner forearm, fine line style.',           NOW() + INTERVAL '7 days',  'pending',   NULL),
  ('Meera Nair',   'meera@example.com', '9123456789', 'priya-sharma', 'Blackwork', 'Botanical half sleeve — roses and ferns, blackwork.',           NOW() + INTERVAL '14 days', 'confirmed', 'Deposit received. First session ~3 hrs.')
) AS t(name, email, phone, slug, style, description, preferred_date, status, admin_notes)
JOIN artists a ON a.slug = t.slug;
