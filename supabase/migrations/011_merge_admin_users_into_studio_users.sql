-- Migration 011: fold the NextAuth admin_users table into studio.users
--
-- The site ran two independent login systems: NextAuth over public.admin_users
-- for /admin (shop, portfolio, website content) and a jose JWT over
-- studio.users for /storeadmin (the CRM). Retiring NextAuth leaves one, so the
-- accounts have to live in one table.
--
-- public.admin_users holds a single row, `admin`, seeded on 2026-03-19. Its
-- password_hash is bcrypt, which is what studio.users already stores and what
-- bcryptjs.compareSync verifies, so it ports across unchanged and whoever uses
-- that password keeps signing in with it.
--
-- THE NAME COLLIDES. studio.users already has its own, different `admin`, with
-- a different password. Importing over it would silently change which password
-- works for that username, so a colliding row is imported under `<name>-shop`
-- instead. Both credentials keep working and neither is a surprise.
--
-- Role `admin` is the faithful mapping: NextAuth had no roles at all, any
-- admin_users row could call every /api/admin endpoint, and `admin` (Manager)
-- is exactly that reach without finance or logins.
--
-- Idempotent, and it never modifies or deletes an existing studio.users row.
-- public.admin_users is deliberately left in place as the rollback path. Drop
-- it only once the merged logins are confirmed working.

DO $$
DECLARE
  src record;
  target_name text;
BEGIN
  -- Nothing to do if the old table is already gone.
  IF to_regclass('public.admin_users') IS NULL THEN
    RAISE NOTICE 'public.admin_users does not exist, nothing to migrate';
    RETURN;
  END IF;

  FOR src IN SELECT username, password_hash FROM public.admin_users LOOP
    target_name := src.username;

    IF EXISTS (SELECT 1 FROM studio.users u WHERE u.username = target_name) THEN
      target_name := src.username || '-shop';
    END IF;

    -- Already imported on a previous run.
    IF EXISTS (SELECT 1 FROM studio.users u WHERE u.username = target_name) THEN
      RAISE NOTICE 'skipping %, already present as %', src.username, target_name;
      CONTINUE;
    END IF;

    INSERT INTO studio.users (username, password_hash, role, artist_id, is_active)
    VALUES (target_name, src.password_hash, 'admin', NULL, true);

    RAISE NOTICE 'imported % as %', src.username, target_name;
  END LOOP;
END $$;
