-- Let a community post carry several images instead of exactly one.
--
-- `image_url` is kept and kept authoritative as the COVER image, because the
-- grid cards and every existing row already depend on it. `images` holds the
-- full set, cover included, so the detail view can show a gallery.
--
-- Targets the WEBSITE schema (public), not the storeadmin CRM.

alter table public.community_posts
  add column if not exists images text[] not null default '{}';

-- Existing posts become a one-image gallery, so nothing renders differently
-- until someone adds a second image. Guarded so re-running is a no-op.
update public.community_posts
   set images = array[image_url]
 where image_url is not null
   and coalesce(array_length(images, 1), 0) = 0;
