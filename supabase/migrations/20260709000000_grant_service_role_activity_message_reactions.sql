-- 20260630100000_activity_message_reactions.sql created this table after
-- 20260618100000_grant_api_role_privileges.sql ran its one-time blanket
-- GRANT ALL ON ALL TABLES ... TO service_role. New tables don't retroactively
-- pick that up, and the reactions migration only granted anon/authenticated
-- (mirroring its RLS policy roles), so service_role was left with no
-- privileges on this table — breaking admin/seed tooling that uses the
-- service role. Same class of gap already fixed for other tables in
-- 20260701091457_fix_missing_rls_policies.sql.

GRANT SELECT, INSERT, DELETE ON public.activity_message_reactions TO service_role;
