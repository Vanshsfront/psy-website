-- Migration 015: grant service_role access to manual_entries
--
-- Migration 013 created the table with RLS enabled and a service_role policy,
-- and stopped there. That is not enough. A policy says which rows a role may
-- touch; a GRANT says whether it may touch the table at all, and without one
-- Postgres refuses before any policy is consulted.
--
-- The symptom was misleading twice over. PostgREST returned "permission denied
-- for table manual_entries", the route caught it and passed it to
-- authErrorResponse, which maps anything that is not the literal string
-- "Forbidden" to 401. So a missing grant surfaced as "Unauthorized" on the
-- salary and balance sheet screens for a perfectly valid owner session, while
-- every other screen worked.
--
-- Matches exactly what studio.orders and studio.appointments already grant.

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON studio.manual_entries TO service_role;
