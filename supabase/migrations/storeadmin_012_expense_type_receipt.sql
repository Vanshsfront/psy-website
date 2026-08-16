-- Expense type (petty vs business) and an attached bill/receipt.
--
-- The studio currently records expenses in a WhatsApp group and keeps the
-- receipt photos in that same chat. Both need to live on the expense row for the
-- group to be retired.
--
-- Targets the STOREADMIN schema (`studio`), not the website's `public`.

alter table studio.expenses
  add column if not exists expense_type text not null default 'business',
  add column if not exists receipt_url  text;

-- Only the two values the UI offers. Named so a bad insert reports the column
-- rather than a generic constraint violation.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_expense_type_check'
  ) then
    alter table studio.expenses
      add constraint expenses_expense_type_check
      check (expense_type in ('petty', 'business'));
  end if;
end
$$;

-- Petty-cash top-ups are recorded as expense rows with category='topup' and are
-- excluded from every expense total. They are float movements, so they classify
-- as petty rather than inheriting the 'business' default.
update studio.expenses
   set expense_type = 'petty'
 where category = 'topup'
   and expense_type <> 'petty';

-- The Expenses screen filters by type and by payment mode over a date window.
create index if not exists expenses_type_idx         on studio.expenses (expense_type);
create index if not exists expenses_payment_mode_idx on studio.expenses (payment_mode);
