-- Migration 014: guest artists and who sourced the work
--
-- Yogesh, 2026-08-19: "George and Guest artists are external freelancers and
-- work on commission basis. Have no base pay and a 70:30 logic for customers
-- sourced by the studio and a 30:70 revenue share logic for the customers
-- sourced by the guest artists. It would be amazing if we have the ability to
-- create a login with external guest artists as well so we can document
-- commissions and revenue on both sides."
--
-- Two things were missing to make that calculable.
--
-- 1. Nothing marked an artist as external. `is_active` says whether they appear
--    in the new-order dropdown, not how they are paid.
--
-- 2. NOTHING RECORDED WHO BROUGHT THE CUSTOMER. `orders.source` and
--    `customers.source` hold walk-in, referral, instagram and so on, which is
--    the channel, not whether the studio or the guest artist found them. The
--    split cannot be worked out without it.
--
-- `sourced_by` therefore sits on the ORDER rather than the customer. A customer
-- introduced by one guest artist can later be served by another, or come back
-- to the studio directly, and the revenue share applies to the job in front of
-- you rather than to who met them first.
--
-- It is deliberately NULLABLE with no default. Every historical order predates
-- the question, and guessing "studio" on 2,483 existing rows would invent a
-- 70:30 split nobody agreed to. Unknown stays unknown, is reported as unknown
-- on the slip, and is excluded from the commission rather than assumed.

ALTER TABLE studio.artists
  ADD COLUMN IF NOT EXISTS is_guest_artist boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN studio.artists.is_guest_artist IS
  'External freelancer: no base pay, paid a revenue share per order. See migration 014.';

ALTER TABLE studio.orders
  ADD COLUMN IF NOT EXISTS sourced_by text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_sourced_by_check') THEN
    ALTER TABLE studio.orders
      ADD CONSTRAINT orders_sourced_by_check
      CHECK (sourced_by IS NULL OR sourced_by IN ('studio', 'artist'));
  END IF;
END $$;

COMMENT ON COLUMN studio.orders.sourced_by IS
  'Who brought this job: studio or artist. NULL means nobody recorded it, which is not the same as "studio". See migration 014.';

CREATE INDEX IF NOT EXISTS orders_sourced_by_idx ON studio.orders (sourced_by);

-- The two known external names. "Guest Artist" is a catch-all bucket rather
-- than a person, but it is paid on the same basis, so it is flagged too.
UPDATE studio.artists
   SET is_guest_artist = true
 WHERE name IN ('George', 'Guest Artist');
