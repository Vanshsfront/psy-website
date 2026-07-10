-- Self-serve guest-artist applications. The public application form inserts here
-- (via the service-role API). Admins review in the dashboard; approving creates a
-- draft guest_spot. Applicant portfolio images live in a dedicated public bucket.

CREATE TABLE IF NOT EXISTS guest_artist_applications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  phone           TEXT,
  type_of_artist  TEXT,
  years_experience INT,
  portfolio_link  TEXT,
  images          TEXT[]      NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  guest_spot_id   UUID        REFERENCES guest_spots(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_artist_applications_status
  ON guest_artist_applications(status);

-- RLS on. Reads/writes go through the service role (public POST API + admin API),
-- which bypasses RLS, so no public policies are granted on the table itself.
ALTER TABLE guest_artist_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Storage bucket for applicant portfolio images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('guest-applications', 'guest-applications', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read guest-applications"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guest-applications');

-- No TO clause → applies to all roles incl. anon, so the public apply form can
-- upload directly (mirrors the existing guest-spot-images upload policy).
CREATE POLICY "Public upload guest-applications"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'guest-applications');
