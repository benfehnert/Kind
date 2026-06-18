-- Supabase CLI auto_expose_new_tables now defaults to false (May 2026).
-- Migration-created tables are no longer auto-granted to API roles; RLS policies
-- alone are not enough — PostgREST also requires table-level GRANTs.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
