-- ============================================================
-- Enable RLS on all public tables + add access policies
-- ============================================================

-- -------------------------------------------------------
-- 1. Enable RLS
-- -------------------------------------------------------
ALTER TABLE public.individuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researcher_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploration_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploration_expected_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploration_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploration_chart_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researcher_explorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_explorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researcher_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_nices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researcher_exploration_nices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 2. Fix security-definer views → security invoker
-- -------------------------------------------------------
ALTER VIEW public.exploration_participants SET (security_invoker = true);
ALTER VIEW public.activity_nice_counts SET (security_invoker = true);
ALTER VIEW public.researcher_exploration_nice_counts SET (security_invoker = true);

-- -------------------------------------------------------
-- 3. Catalog tables: public read (anon + authenticated), service_role only for writes
--    explorations, phases, outcomes, kpis, chart_points, log_field_defs,
--    researchers, researcher_areas, researcher_explorations
-- -------------------------------------------------------
CREATE POLICY "catalog_select" ON public.explorations
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.exploration_phases
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.exploration_expected_outcomes
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.exploration_kpis
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.exploration_chart_points
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.log_field_defs
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.researchers
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.researcher_areas
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_select" ON public.researcher_explorations
  FOR SELECT TO anon, authenticated USING (true);

-- -------------------------------------------------------
-- 4. individuals
--    SELECT: all authenticated (needed for community features)
--    INSERT/UPDATE/DELETE: own row only (auth_user_id = auth.uid())
-- -------------------------------------------------------
CREATE POLICY "individuals_select" ON public.individuals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "individuals_insert" ON public.individuals
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = auth_user_id);

CREATE POLICY "individuals_update" ON public.individuals
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id)
  WITH CHECK ((SELECT auth.uid()) = auth_user_id);

CREATE POLICY "individuals_delete" ON public.individuals
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);

-- -------------------------------------------------------
-- 5. privacy_settings (own only — sensitive)
-- -------------------------------------------------------
CREATE POLICY "privacy_settings_select" ON public.privacy_settings
  FOR SELECT TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "privacy_settings_insert" ON public.privacy_settings
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "privacy_settings_update" ON public.privacy_settings
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 6. user_explorations
--    SELECT: all authenticated (participation is public; powers exploration_participants view)
--    INSERT/UPDATE/DELETE: own rows only
-- -------------------------------------------------------
CREATE POLICY "user_explorations_select" ON public.user_explorations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_explorations_insert" ON public.user_explorations
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "user_explorations_update" ON public.user_explorations
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "user_explorations_delete" ON public.user_explorations
  FOR DELETE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 7. daily_logs (health data — own only)
-- -------------------------------------------------------
CREATE POLICY "daily_logs_select" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "daily_logs_insert" ON public.daily_logs
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "daily_logs_update" ON public.daily_logs
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "daily_logs_delete" ON public.daily_logs
  FOR DELETE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 8. individual_badges (system-awarded — read-only for users)
-- -------------------------------------------------------
CREATE POLICY "individual_badges_select" ON public.individual_badges
  FOR SELECT TO authenticated USING (true);

-- -------------------------------------------------------
-- 9. activity_posts (community: all authenticated can read, own write)
-- -------------------------------------------------------
CREATE POLICY "activity_posts_select" ON public.activity_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_posts_insert" ON public.activity_posts
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "activity_posts_update" ON public.activity_posts
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "activity_posts_delete" ON public.activity_posts
  FOR DELETE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 10. individual_follows
-- -------------------------------------------------------
CREATE POLICY "individual_follows_select" ON public.individual_follows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "individual_follows_insert" ON public.individual_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "individual_follows_delete" ON public.individual_follows
  FOR DELETE TO authenticated
  USING (follower_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 11. researcher_follows
-- -------------------------------------------------------
CREATE POLICY "researcher_follows_select" ON public.researcher_follows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "researcher_follows_insert" ON public.researcher_follows
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "researcher_follows_delete" ON public.researcher_follows
  FOR DELETE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 12. activity_nices
-- -------------------------------------------------------
CREATE POLICY "activity_nices_select" ON public.activity_nices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_nices_insert" ON public.activity_nices
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "activity_nices_delete" ON public.activity_nices
  FOR DELETE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 13. activity_messages
-- -------------------------------------------------------
CREATE POLICY "activity_messages_select" ON public.activity_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_messages_insert" ON public.activity_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "activity_messages_delete" ON public.activity_messages
  FOR DELETE TO authenticated
  USING (sender_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 14. researcher_exploration_nices
-- -------------------------------------------------------
CREATE POLICY "researcher_exploration_nices_select" ON public.researcher_exploration_nices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "researcher_exploration_nices_insert" ON public.researcher_exploration_nices
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "researcher_exploration_nices_delete" ON public.researcher_exploration_nices
  FOR DELETE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- 15. feed_items (read-only for authenticated users)
-- -------------------------------------------------------
CREATE POLICY "feed_items_select" ON public.feed_items
  FOR SELECT TO authenticated USING (true);

-- -------------------------------------------------------
-- 16. waitlist_entries (anyone can sign up, no self-read via API)
-- -------------------------------------------------------
CREATE POLICY "waitlist_entries_insert" ON public.waitlist_entries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
