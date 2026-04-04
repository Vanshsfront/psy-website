-- ============================================================
-- PSY Tattoos — Studio Tabs Migration
-- New tables: community_posts, guest_spots, guest_spot_leads, customer_testimonials
-- ============================================================

-- 1. community_posts
CREATE TABLE IF NOT EXISTS community_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  description   TEXT,
  type          TEXT        NOT NULL DEFAULT 'announcement',
  image_url     TEXT,
  event_date    TIMESTAMPTZ,
  is_published  BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. guest_spots
CREATE TABLE IF NOT EXISTS guest_spots (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name       TEXT        NOT NULL,
  bio               TEXT,
  instagram         TEXT,
  portfolio_images  TEXT[]      DEFAULT '{}',
  dates_available   TEXT,
  date_start        DATE,
  date_end          DATE,
  is_published      BOOLEAN     DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. guest_spot_leads (public form submissions)
CREATE TABLE IF NOT EXISTS guest_spot_leads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_spot_id  UUID        REFERENCES guest_spots(id) ON DELETE SET NULL,
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT,
  message        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. customer_testimonials
CREATE TABLE IF NOT EXISTS customer_testimonials (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  TEXT        NOT NULL,
  review_text    TEXT,
  rating         INT         CHECK (rating >= 1 AND rating <= 5),
  image_url      TEXT,
  is_published   BOOLEAN     DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE community_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_spots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_spot_leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_testimonials ENABLE ROW LEVEL SECURITY;

-- Public read for published content
CREATE POLICY "Public read published community_posts"
  ON community_posts FOR SELECT USING (is_published = true);

CREATE POLICY "Public read published guest_spots"
  ON guest_spots FOR SELECT USING (is_published = true);

CREATE POLICY "Public read published customer_testimonials"
  ON customer_testimonials FOR SELECT USING (is_published = true);

-- Public insert for guest spot leads
CREATE POLICY "Public can insert guest_spot_leads"
  ON guest_spot_leads FOR INSERT WITH CHECK (true);

-- Service role full access (admin operations)
CREATE POLICY "Service role full access community_posts"
  ON community_posts FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access guest_spots"
  ON guest_spots FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access guest_spot_leads"
  ON guest_spot_leads FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customer_testimonials"
  ON customer_testimonials FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- updated_at triggers (reuses existing update_updated_at_column function)
-- ============================================================

CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_spots_updated_at
  BEFORE UPDATE ON guest_spots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_testimonials_updated_at
  BEFORE UPDATE ON customer_testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('community-images',   'community-images',   true),
  ('guest-spot-images',  'guest-spot-images',  true),
  ('testimonial-images', 'testimonial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for all new buckets
CREATE POLICY "Public read community-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

CREATE POLICY "Public read guest-spot-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guest-spot-images');

CREATE POLICY "Public read testimonial-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'testimonial-images');

-- Service role upload/delete for new buckets
CREATE POLICY "Service upload community-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'community-images');

CREATE POLICY "Service upload guest-spot-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'guest-spot-images');

CREATE POLICY "Service upload testimonial-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'testimonial-images');

CREATE POLICY "Service delete community-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'community-images');

CREATE POLICY "Service delete guest-spot-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'guest-spot-images');

CREATE POLICY "Service delete testimonial-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'testimonial-images');
