-- Campaigns + WhatsApp message audit trail.
-- Both tables are referenced by lib/storeadmin/server/database.ts but were
-- never created. Without them, the campaign send flow silently swallows
-- insert errors and the webhook at /api/storeadmin/whatsapp/webhook has
-- no rows to update with delivery state.

create extension if not exists "pgcrypto";

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  template_name text not null,
  nl_filter_text text,
  resolved_query text,
  matched_count integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_created_at_idx on public.campaigns (created_at desc);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  customer_id uuid,
  phone text,
  template_name text,
  rendered_payload jsonb,
  status text not null default 'pending',
  error_message text,
  whatsapp_message_id text,
  sent_at timestamptz not null default now()
);

create index if not exists message_logs_wamid_idx on public.message_logs (whatsapp_message_id);
create index if not exists message_logs_campaign_idx on public.message_logs (campaign_id);
create index if not exists message_logs_sent_at_idx on public.message_logs (sent_at desc);

alter table public.campaigns enable row level security;
alter table public.message_logs enable row level security;

drop policy if exists "service role full access campaigns" on public.campaigns;
create policy "service role full access campaigns" on public.campaigns
  for all to service_role using (true) with check (true);

drop policy if exists "service role full access message_logs" on public.message_logs;
create policy "service role full access message_logs" on public.message_logs
  for all to service_role using (true) with check (true);
