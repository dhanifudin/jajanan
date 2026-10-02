-- ============================================================
-- Grant service_role access to the jajanan schema up front (Edge
-- Functions authenticate with the service_role key). Migration 001
-- granted anon + authenticated only; service_role already has BYPASSRLS
-- so no RLS changes are needed here, just the schema/table grants.
-- See lulu/supabase/migrations/007_service_role_grants.sql for the bug
-- this proactively avoids (silent permission-denied → no pushes sent).
-- ============================================================

grant usage on schema jajanan to service_role;

grant all on all tables    in schema jajanan to service_role;
grant all on all sequences in schema jajanan to service_role;
grant all on all functions in schema jajanan to service_role;

alter default privileges in schema jajanan grant all on tables    to service_role;
alter default privileges in schema jajanan grant all on sequences to service_role;
alter default privileges in schema jajanan grant all on functions to service_role;
