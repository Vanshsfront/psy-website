-- Migration 010: storage.objects policies for the self-hosted stack
--
-- The buckets and their policies were created in the hosted Supabase dashboard,
-- so they lived in the `storage` schema and never came across in the cutover —
-- migrate-db.sh only moves `public` and `studio`. The buckets themselves were
-- recreated by migrate-storage.py, but `storage.objects` arrived with RLS ON and
-- ZERO policies, which denies every write. Reads kept working because public
-- buckets are served by storage-api itself, so the only visible symptom was
-- "new row violates row-level security policy" on every upload — in /admin
-- (blog covers, products, portfolio, artists, testimonials, community, guest
-- spots), on the public guest-artist apply form, and on storeadmin receipts.
--
-- These are a transcription of the 27 policies read back out of the hosted
-- project (ref cokusgyvvybkyzebfbxs) on 2026-08-18, names and all, so the
-- self-hosted stack grants exactly what the hosted one did and no more. Note
-- the deliberate asymmetry, which is the hosted project's, not an oversight:
--
--   * the four /admin-only buckets get read/insert/update/delete
--   * community-images, guest-spot-images and testimonial-images get no UPDATE
--     (uploads run with upsert:false, so nothing ever updates a row)
--   * guest-applications gets read+insert only — the public apply form writes
--     there and nothing is allowed to remove what an applicant submitted
--
-- None carries a TO clause, so they apply to every role. Uploads run in the
-- browser under the anon key, from both an authenticated /admin page and the
-- public apply form, so scoping them to `authenticated` would break both.
-- Tightening this means moving uploads to a server route holding the
-- service-role key; until then this is parity with what shipped.
--
-- 003_storage_policies.sql covers only three of the eight buckets and assumes
-- Supabase Auth, which this stack does not run. It never applied here.

-- ─── the four /admin-managed buckets: full CRUD ───

DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['artist-photos', 'portfolio', 'product-images', 'site-settings'] LOOP
    -- site-settings' read policy is the one the hosted project named on the
    -- shorter pattern. Kept verbatim so a policy diff against it stays empty.
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Public read access for ' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Public read ' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Admin insert access for ' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Admin update access for ' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Admin delete access for ' || b);

    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)',
      CASE WHEN b = 'site-settings' THEN 'Public read ' || b ELSE 'Public read access for ' || b END, b);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L)',
      'Admin insert access for ' || b, b);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE USING (bucket_id = %L)',
      'Admin update access for ' || b, b);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE USING (bucket_id = %L)',
      'Admin delete access for ' || b, b);
  END LOOP;
END $$;

-- ─── read + insert + delete, no update ───

DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['community-images', 'guest-spot-images', 'testimonial-images'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Public read ' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Service upload ' || b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Service delete ' || b);

    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L)',
      'Public read ' || b, b);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L)',
      'Service upload ' || b, b);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE USING (bucket_id = %L)',
      'Service delete ' || b, b);
  END LOOP;
END $$;

-- ─── the public apply form's bucket: read + insert only ───

DROP POLICY IF EXISTS "Public read guest-applications" ON storage.objects;
DROP POLICY IF EXISTS "Public upload guest-applications" ON storage.objects;

CREATE POLICY "Public read guest-applications"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guest-applications');

CREATE POLICY "Public upload guest-applications"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'guest-applications');

-- Clean up the first, over-permissive pass at this migration: it granted UPDATE
-- on all eight buckets and DELETE on guest-applications, five grants the hosted
-- project never had and no code path uses.
DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY[
    'artist-photos', 'community-images', 'guest-applications', 'guest-spot-images',
    'portfolio', 'product-images', 'site-settings', 'testimonial-images'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' read');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' insert');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' update');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || ' delete');
  END LOOP;
END $$;
