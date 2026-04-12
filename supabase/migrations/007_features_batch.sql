-- ============================================================
-- 007_features_batch.sql
-- Site settings, product categories, community content column
-- ============================================================

-- 1. Site settings (homepage images, meet the team, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_settings"
  ON site_settings FOR SELECT USING (true);

CREATE POLICY "Service role full access site_settings"
  ON site_settings FOR ALL USING (auth.role() = 'service_role');

INSERT INTO site_settings (key, value) VALUES
  ('homepage_images', '{
    "left_image_url": "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=1400&q=80&auto=format&fit=crop",
    "right_image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&q=80&auto=format&fit=crop"
  }'::jsonb),
  ('meet_the_team', '{
    "photo_url": "",
    "heading": "Meet the Team",
    "description": ""
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- 2. Product categories
CREATE TABLE IF NOT EXISTS product_categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  sort_order  INT         DEFAULT 0,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product_categories"
  ON product_categories FOR SELECT USING (true);

CREATE POLICY "Service role full access product_categories"
  ON product_categories FOR ALL USING (auth.role() = 'service_role');

INSERT INTO product_categories (name, slug, sort_order) VALUES
  ('Rings',           'rings',            1),
  ('Necklaces',       'necklaces',        2),
  ('Earrings',        'earrings',         3),
  ('Bracelets',       'bracelets',        4),
  ('Cuffs',           'cuffs',            5),
  ('Limited Edition', 'limited-edition',  6)
ON CONFLICT (name) DO NOTHING;


-- 3. Community posts: add content column for full blog content
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS content TEXT;
