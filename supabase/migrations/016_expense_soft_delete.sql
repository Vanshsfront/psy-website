-- Migration 016: let expense entries be deleted
--
-- Yogesh, 2026-08-21: "can you also add the option of deleting expense entries?
-- Have to add a set off entry to settle any incorrect ones due to this
-- limitation"
--
-- Correcting a mistyped expense meant adding a second, opposite entry to cancel
-- it out. That leaves both rows in the ledger, so the expense count is wrong,
-- the category breakdown carries a phantom pair, and anyone reading the sheet
-- later has to work out that two entries are really one correction.
--
-- Soft, not hard. These rows feed the finance summary, the balance sheet, the
-- petty cash balance and Sohel's profit-share commission, so a deleted expense
-- has to stay reconstructable: "who removed the 12,000 rent entry and when" is
-- a question that will be asked. Every other money record here is soft-deleted
-- the same way (orders, appointments, manual_entries).

ALTER TABLE studio.expenses
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text;

COMMENT ON COLUMN studio.expenses.is_deleted IS
  'Soft delete. EVERY read of this table must filter on it: the list, the petty cash balance, the top-up log, the finance summary and the balance sheet. Missing one makes the screens disagree. See migration 016.';

-- Every read filters on this, so it leads the index.
CREATE INDEX IF NOT EXISTS expenses_live_date_idx
  ON studio.expenses (is_deleted, expense_date DESC);
