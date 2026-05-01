-- Daily tally / cash-collection comments. One date can have many notes.
-- This migration targets the STOREADMIN Supabase project (not the website DB).

create extension if not exists "pgcrypto";

create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  note_date date not null,
  body text not null,
  author text,
  created_at timestamptz not null default now()
);

create index if not exists daily_notes_date_idx on public.daily_notes (note_date desc);
create index if not exists daily_notes_created_at_idx on public.daily_notes (created_at desc);

alter table public.daily_notes enable row level security;

drop policy if exists "service role full access daily_notes" on public.daily_notes;
create policy "service role full access daily_notes" on public.daily_notes
  for all to service_role using (true) with check (true);
