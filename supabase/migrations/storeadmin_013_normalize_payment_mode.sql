-- Collapse the case variants in studio.orders.payment_mode.
--
-- The column holds 'UPI' and 'upi', 'Cash' and 'cash', 'Card' and 'card' as
-- distinct values, so anything grouping by payment mode splits one real category
-- across two rows. Measured before this ran: UPI reported 1,332 orders / Rs 38.9L
-- when the true figure was 1,634 / Rs 49.1L — understated by Rs 10.1L.
--
-- Values are lowercased rather than title-cased to match createOrder(), which
-- has always written `payment_mode.toLowerCase()`; the capitalised rows are
-- legacy imports.
--
-- Targets the STOREADMIN schema (`studio`).

-- The literal string 'None' was imported for orders with no recorded mode. It is
-- indistinguishable from a real value once lowercased, so it becomes NULL — the
-- honest representation of "not recorded".
update studio.orders
   set payment_mode = null
 where lower(trim(payment_mode)) in ('none', '');

update studio.orders
   set payment_mode = lower(trim(payment_mode))
 where payment_mode is not null
   and payment_mode <> lower(trim(payment_mode));

-- Keeps it clean going forward. A trigger rather than a CHECK constraint because
-- the goal is to normalise silently, not to reject a save and lose the order.
create or replace function studio.normalize_payment_mode()
returns trigger language plpgsql as $$
begin
  if new.payment_mode is not null then
    new.payment_mode := nullif(lower(trim(new.payment_mode)), '');
    if new.payment_mode = 'none' then
      new.payment_mode := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_normalize_payment_mode on studio.orders;
create trigger orders_normalize_payment_mode
  before insert or update on studio.orders
  for each row execute function studio.normalize_payment_mode();
