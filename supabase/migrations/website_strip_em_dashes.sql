-- Strip em dashes (—, U+2014) and en dashes (–, U+2013) from existing public-facing
-- content. Rule: a spaced em dash " — " reads best as a comma ", "; any remaining
-- em/en dash collapses to a hyphen "-". TipTap stores HTML with the dash as literal
-- text, so plain replace() works on rich-text columns too.
--
-- Idempotent: re-running is a no-op once dashes are gone.

-- Helper expression repeated per column:
--   replace(replace(replace(col, ' — ', ', '), '—', '-'), '–', '-')

-- blog_posts
UPDATE blog_posts SET
  title   = replace(replace(replace(title,   ' — ', ', '), '—', '-'), '–', '-'),
  excerpt = replace(replace(replace(excerpt, ' — ', ', '), '—', '-'), '–', '-'),
  content = replace(replace(replace(content, ' — ', ', '), '—', '-'), '–', '-'),
  author  = replace(replace(replace(author,  ' — ', ', '), '—', '-'), '–', '-')
WHERE title   LIKE '%—%' OR title   LIKE '%–%'
   OR excerpt LIKE '%—%' OR excerpt LIKE '%–%'
   OR content LIKE '%—%' OR content LIKE '%–%'
   OR author  LIKE '%—%' OR author  LIKE '%–%';

-- community_posts (events, collaborations, announcements)
UPDATE community_posts SET
  title       = replace(replace(replace(title,       ' — ', ', '), '—', '-'), '–', '-'),
  description = replace(replace(replace(description, ' — ', ', '), '—', '-'), '–', '-')
WHERE title       LIKE '%—%' OR title       LIKE '%–%'
   OR description LIKE '%—%' OR description LIKE '%–%';

-- products
UPDATE products SET
  name              = replace(replace(replace(name,              ' — ', ', '), '—', '-'), '–', '-'),
  description_short = replace(replace(replace(description_short, ' — ', ', '), '—', '-'), '–', '-'),
  description_full  = replace(replace(replace(description_full,  ' — ', ', '), '—', '-'), '–', '-')
WHERE name              LIKE '%—%' OR name              LIKE '%–%'
   OR description_short LIKE '%—%' OR description_short LIKE '%–%'
   OR description_full  LIKE '%—%' OR description_full  LIKE '%–%';

-- guest_spots
UPDATE guest_spots SET
  artist_name = replace(replace(replace(artist_name, ' — ', ', '), '—', '-'), '–', '-'),
  bio         = replace(replace(replace(bio,         ' — ', ', '), '—', '-'), '–', '-')
WHERE artist_name LIKE '%—%' OR artist_name LIKE '%–%'
   OR bio         LIKE '%—%' OR bio         LIKE '%–%';

-- artists
UPDATE artists SET
  name = replace(replace(replace(name, ' — ', ', '), '—', '-'), '–', '-'),
  bio  = replace(replace(replace(bio,  ' — ', ', '), '—', '-'), '–', '-')
WHERE name LIKE '%—%' OR name LIKE '%–%'
   OR bio  LIKE '%—%' OR bio  LIKE '%–%';

-- collections
UPDATE collections SET
  name        = replace(replace(replace(name,        ' — ', ', '), '—', '-'), '–', '-'),
  description = replace(replace(replace(description, ' — ', ', '), '—', '-'), '–', '-')
WHERE name        LIKE '%—%' OR name        LIKE '%–%'
   OR description LIKE '%—%' OR description LIKE '%–%';

-- customer_testimonials
UPDATE customer_testimonials SET
  customer_name = replace(replace(replace(customer_name, ' — ', ', '), '—', '-'), '–', '-'),
  review_text   = replace(replace(replace(review_text,   ' — ', ', '), '—', '-'), '–', '-')
WHERE customer_name LIKE '%—%' OR customer_name LIKE '%–%'
   OR review_text   LIKE '%—%' OR review_text   LIKE '%–%';
