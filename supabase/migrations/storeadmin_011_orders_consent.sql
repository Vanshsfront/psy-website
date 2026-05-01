-- Adds a generic studio-consent flag to orders.
-- Targets the STOREADMIN Supabase project.

alter table public.orders
  add column if not exists consent_signed boolean not null default false;
