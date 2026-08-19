-- Migration 012: one artist record instead of two
--
-- There were two unrelated artist tables, a legacy of the two Supabase projects
-- that were consolidated into this database:
--
--   public.artists  the website roster: slug, bio, speciality, instagram, photo.
--                   29 portfolio_items point at it.
--   studio.artists  the CRM lookup: name, is_active. 1,881 orders, 5
--                   appointments and the artist logins point at it.
--
-- Yogesh asked to combine them "if possible ... without losing out on
-- functionality". studio.artists is the survivor because three foreign key sets
-- point at it against the website's one, so this rewrites 29 references rather
-- than 1,886.
--
-- NAMES DO NOT MATCH, so this cannot be automatic. The website carries full
-- names and the CRM carries what people are called day to day:
--
--   Aryan Shivshanker  (website)  =  Aryan  (CRM, 164 orders)
--   Sohel Patel        (website)  =  Sohel  (CRM, 759 orders)
--
-- Both pairings were confirmed by Yogesh on 2026-08-19. They are written out
-- below rather than guessed by a fuzzy match, because pairing the wrong rows
-- silently reassigns hundreds of orders and the revenue attached to them. The
-- other seven CRM artists (Raj, Dhiraj, Kshipra, Krutika, Riddhi, George and
-- the "Guest Artist" catch-all) have no public profile and correctly gain none:
-- "Guest Artist" is a bucket, not a person.
--
-- Afterwards public.artists is a VIEW over studio.artists, so every existing
-- website query, portfolio join and admin screen keeps working untouched. The
-- view is filtered to rows that have a slug, which reproduces exactly today's
-- behaviour: only artists with a public profile appear on the website, and the
-- CRM's inactive names are not suddenly published.
--
-- The old table is kept as public.artists_legacy. Drop it only once this is
-- confirmed working.

BEGIN;

-- ── 1. studio.artists gains the website fields ──

ALTER TABLE studio.artists
  -- The CRM calls people what the studio calls them day to day ("Aryan"), and
  -- the website shows their full name ("Aryan Shivshanker"). Both are needed:
  -- OCR order import matches artists by exact name via getArtistByName and
  -- creates a new one when it misses, so renaming `name` to the full version
  -- would silently spawn a duplicate "Aryan" on the next imported order.
  ADD COLUMN IF NOT EXISTS display_name      text,
  ADD COLUMN IF NOT EXISTS slug              text,
  ADD COLUMN IF NOT EXISTS bio               text,
  ADD COLUMN IF NOT EXISTS speciality        text,
  ADD COLUMN IF NOT EXISTS instagram         text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Slugs address a page on the public site, so they have to stay unique. Partial,
-- because the artists with no public profile all have NULL and would otherwise
-- collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS artists_slug_key
  ON studio.artists (slug) WHERE slug IS NOT NULL;

-- ── 2. the confirmed pairings ──

CREATE TEMP TABLE artist_pairing (website_name text, crm_name text) ON COMMIT DROP;
INSERT INTO artist_pairing (website_name, crm_name) VALUES
  ('Aryan Shivshanker', 'Aryan'),
  ('Sohel Patel',       'Sohel');

-- Fail loudly rather than half-migrating if either side has moved since this was
-- written. A silent no-match here is what would split an artist in two.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(format('%s -> %s', p.website_name, p.crm_name), ', ')
    INTO missing
  FROM artist_pairing p
  WHERE NOT EXISTS (SELECT 1 FROM public.artists a WHERE a.name = p.website_name)
     OR NOT EXISTS (SELECT 1 FROM studio.artists s WHERE s.name = p.crm_name);

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'pairing no longer matches the data: %', missing;
  END IF;
END $$;

-- ── 3. carry the website fields across ──

UPDATE studio.artists s
   SET display_name      = a.name,
       slug              = a.slug,
       bio               = a.bio,
       speciality        = a.speciality,
       instagram         = a.instagram,
       profile_photo_url = a.profile_photo_url
  FROM artist_pairing p
  JOIN public.artists a ON a.name = p.website_name
 WHERE s.name = p.crm_name;

-- Any website artist with no counterpart becomes a new CRM record rather than
-- being dropped. None today, but a silent deletion is not an acceptable
-- failure mode if this is ever re-run against different data.
INSERT INTO studio.artists (name, display_name, is_active, slug, bio, speciality, instagram, profile_photo_url)
SELECT a.name, a.name, true, a.slug, a.bio, a.speciality, a.instagram, a.profile_photo_url
  FROM public.artists a
 WHERE NOT EXISTS (SELECT 1 FROM artist_pairing p WHERE p.website_name = a.name);

-- ── 4. repoint the portfolio ──

CREATE TEMP TABLE artist_id_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;

INSERT INTO artist_id_map (old_id, new_id)
SELECT a.id, s.id
  FROM public.artists a
  JOIN artist_pairing p ON p.website_name = a.name
  JOIN studio.artists s ON s.name = p.crm_name;

INSERT INTO artist_id_map (old_id, new_id)
SELECT a.id, s.id
  FROM public.artists a
  JOIN studio.artists s ON s.name = a.name
 WHERE NOT EXISTS (SELECT 1 FROM artist_pairing p WHERE p.website_name = a.name)
   AND NOT EXISTS (SELECT 1 FROM artist_id_map m WHERE m.old_id = a.id);

ALTER TABLE public.portfolio_items DROP CONSTRAINT IF EXISTS portfolio_items_artist_id_fkey;

UPDATE public.portfolio_items pi
   SET artist_id = m.new_id
  FROM artist_id_map m
 WHERE pi.artist_id = m.old_id;

-- No portfolio item may be left pointing at an id that is about to disappear.
DO $$
DECLARE
  orphans int;
BEGIN
  SELECT count(*) INTO orphans
    FROM public.portfolio_items pi
   WHERE pi.artist_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM studio.artists s WHERE s.id = pi.artist_id);

  IF orphans > 0 THEN
    RAISE EXCEPTION '% portfolio items would be orphaned', orphans;
  END IF;
END $$;

ALTER TABLE public.portfolio_items
  ADD CONSTRAINT portfolio_items_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES studio.artists(id) ON DELETE SET NULL;

-- ── 5. public.artists becomes a view over the survivor ──

ALTER TABLE public.artists RENAME TO artists_legacy;

-- Column list and order match the old table, so existing `select *` callers and
-- PostgREST embeds are unaffected. Writes are handled by the trigger below.
CREATE VIEW public.artists AS
  SELECT id,
         coalesce(display_name, name) AS name,
         slug, bio, speciality, instagram, profile_photo_url, created_at
    FROM studio.artists
   WHERE slug IS NOT NULL;

-- The name column is an expression, so the view is not auto-updatable and the
-- admin screen's writes need routing by hand. Writing "name" through the view
-- sets display_name, leaving the CRM's short name alone so name-based order
-- import keeps matching.
CREATE OR REPLACE FUNCTION public.artists_view_write() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO studio.artists (name, display_name, is_active, slug, bio, speciality, instagram, profile_photo_url)
    VALUES (NEW.name, NEW.name, true, NEW.slug, NEW.bio, NEW.speciality, NEW.instagram, NEW.profile_photo_url)
    RETURNING id INTO NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE studio.artists
       SET display_name      = NEW.name,
           slug              = NEW.slug,
           bio               = NEW.bio,
           speciality        = NEW.speciality,
           instagram         = NEW.instagram,
           profile_photo_url = NEW.profile_photo_url
     WHERE id = OLD.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Removing somebody from the website must not delete the artist, or their
    -- orders lose their owner. It clears the public profile instead, which is
    -- what "not on the site any more" actually means.
    UPDATE studio.artists
       SET slug = NULL, bio = NULL, speciality = NULL,
           instagram = NULL, profile_photo_url = NULL, display_name = NULL
     WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER artists_view_write_trg
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.artists_view_write();

GRANT SELECT ON public.artists TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.artists TO service_role;

COMMIT;
