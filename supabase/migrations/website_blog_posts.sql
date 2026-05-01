-- Blog posts for the public website. Targets the WEBSITE Supabase project.

create extension if not exists "pgcrypto";

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null,
  cover_image_url text,
  author text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_idx on public.blog_posts (is_published, published_at desc);
create index if not exists blog_posts_slug_idx on public.blog_posts (slug);

alter table public.blog_posts enable row level security;

drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts" on public.blog_posts
  for select using (is_published = true);

drop policy if exists "Service role full access blog_posts" on public.blog_posts;
create policy "Service role full access blog_posts" on public.blog_posts
  for all to service_role using (true) with check (true);
