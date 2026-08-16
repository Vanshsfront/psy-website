-- Appointments, replacing the "PSY - Appointments" WhatsApp group.
--
-- A separate table rather than a status column on studio.orders. An order is
-- money that has been taken; an appointment is a promise that may not happen.
-- Putting bookings in `orders` would have added not-yet-earned rows to every
-- existing aggregate — dashboard revenue, getFinancialSummary, customer
-- lifetime_spend, top artists — all of which sum orders unconditionally.
-- Completing an appointment writes a real order and links back to it.
--
-- Targets the STOREADMIN schema (`studio`).

create table if not exists studio.appointments (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references studio.customers(id) on delete cascade,
  artist_id    uuid references studio.artists(id) on delete set null,

  starts_at    timestamptz not null,
  -- Nullable: the studio books "Saturday afternoon" without committing to a
  -- finish time. The calendar falls back to a one-hour block when it is unset.
  ends_at      timestamptz,

  status       text not null default 'booked',
  service_description text,
  deposit      numeric not null default 0,
  -- What the service is expected to bill, carried into the order on completion
  -- so the manager is not retyping it.
  estimated_total numeric not null default 0,
  notes        text,
  source       text,

  -- Set when the appointment is completed; the resulting revenue row.
  order_id     uuid references studio.orders(id) on delete set null,

  -- Artists may delete their own appointments, so deletes are soft: the row
  -- leaves every view but the studio keeps the history.
  is_deleted   boolean not null default false,
  deleted_at   timestamptz,
  deleted_by   text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_status_check') then
    alter table studio.appointments
      add constraint appointments_status_check
      check (status in ('booked', 'confirmed', 'completed', 'no_show', 'cancelled'));
  end if;

  -- A completed appointment must point at the order it produced, and only a
  -- completed one may. Without this a booking could silently claim revenue.
  if not exists (select 1 from pg_constraint where conname = 'appointments_completed_has_order') then
    alter table studio.appointments
      add constraint appointments_completed_has_order
      check (status <> 'completed' or order_id is not null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointments_ends_after_starts') then
    alter table studio.appointments
      add constraint appointments_ends_after_starts
      check (ends_at is null or ends_at > starts_at);
  end if;
end
$$;

-- The calendar reads a day or month window, and artists read their own column.
create index if not exists appointments_starts_idx   on studio.appointments (starts_at);
create index if not exists appointments_artist_idx   on studio.appointments (artist_id, starts_at);
create index if not exists appointments_customer_idx on studio.appointments (customer_id);
create index if not exists appointments_status_idx   on studio.appointments (status);

create or replace function studio.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists appointments_touch on studio.appointments;
create trigger appointments_touch
  before update on studio.appointments
  for each row execute function studio.touch_updated_at();

alter table studio.appointments enable row level security;
drop policy if exists "service role full access appointments" on studio.appointments;
create policy "service role full access appointments" on studio.appointments
  for all to service_role using (true) with check (true);

grant all on studio.appointments to service_role;
