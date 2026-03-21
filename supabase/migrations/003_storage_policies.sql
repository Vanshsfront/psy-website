-- Migration 003: Supabase Storage bucket policies
-- Creates public buckets for product images, portfolio, and artist photos
-- with appropriate RLS policies.

-- ═══════════════════════════════════════════
-- NOTE: Bucket creation is done via the Supabase dashboard or CLI.
-- Run these commands in the Supabase SQL editor AFTER creating buckets:
--   1. product-images  (public bucket)
--   2. portfolio        (public bucket)
--   3. artist-photos    (public bucket)
-- ═══════════════════════════════════════════

-- ─── product-images bucket ───

-- Anyone can view/download product images
CREATE POLICY "Public read access for product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Only authenticated admin users can upload/update product images
CREATE POLICY "Admin insert access for product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

CREATE POLICY "Admin update access for product-images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

CREATE POLICY "Admin delete access for product-images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

-- ─── portfolio bucket ───

CREATE POLICY "Public read access for portfolio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY "Admin insert access for portfolio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

CREATE POLICY "Admin update access for portfolio"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portfolio'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

CREATE POLICY "Admin delete access for portfolio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolio'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

-- ─── artist-photos bucket ───

CREATE POLICY "Public read access for artist-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-photos');

CREATE POLICY "Admin insert access for artist-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artist-photos'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

CREATE POLICY "Admin update access for artist-photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'artist-photos'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );

CREATE POLICY "Admin delete access for artist-photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'artist-photos'
    AND auth.uid() IN (SELECT id FROM public.admin_users)
  );
