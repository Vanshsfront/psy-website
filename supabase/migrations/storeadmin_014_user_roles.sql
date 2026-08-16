-- Real roles on studio.users, so authorisation can stop being cosmetic.
--
-- Until now `getRoleForUser()` hardcoded `username === 'yogesh' ? superadmin :
-- admin`, and the role was used only to hide sidebar items. No API route checked
-- anything, so any authenticated user could read finance, customers and campaigns
-- by calling the endpoints directly. Artist logins make that a real problem: an
-- artist is meant to see only their own work.
--
-- Targets the STOREADMIN schema (`studio`).

alter table studio.users
  add column if not exists role      text not null default 'admin',
  add column if not exists artist_id uuid references studio.artists(id) on delete set null,
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_role_check') then
    alter table studio.users
      add constraint users_role_check check (role in ('superadmin', 'admin', 'artist'));
  end if;
end
$$;

-- Preserve exactly the behaviour the hardcoded function produced, so nobody's
-- access changes when the lookup moves to the database.
update studio.users set role = 'superadmin' where username = 'yogesh' and role <> 'superadmin';
update studio.users set role = 'admin'      where username <> 'yogesh' and role not in ('superadmin', 'artist');

-- An artist login is meaningless without the artist it speaks for; anything else
-- must NOT carry one, or scoping queries would silently filter on a stale link.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_artist_link_check') then
    alter table studio.users
      add constraint users_artist_link_check
      check ((role = 'artist') = (artist_id is not null));
  end if;
end
$$;

create index if not exists users_artist_idx on studio.users (artist_id);
