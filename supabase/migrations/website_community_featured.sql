-- "What's New" — a homepage slot above the portfolio.
--
-- A flag on community posts rather than a table of its own: collabs, guest spots
-- and events are already posted there, so a second store would mean maintaining
-- the same announcement twice.
--
-- Targets the WEBSITE schema (public).

alter table public.community_posts
  add column if not exists feature_on_homepage boolean not null default false;

-- Partial index: the homepage only ever asks for the featured handful.
create index if not exists community_posts_featured_idx
  on public.community_posts (feature_on_homepage, event_date desc)
  where feature_on_homepage;
