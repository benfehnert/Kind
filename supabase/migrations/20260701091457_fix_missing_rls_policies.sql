-- ============================================================
-- Fix RLS gaps left by 20260612000000_onboarding_reports_consents.sql:
-- that migration created 5 tables but never enabled RLS on them.
-- exploration_trial_report_templates, individual_consents,
-- exploration_consents, and user_exploration_reports were fully exposed
-- via the anon/authenticated GRANTs from 20260618100000. individual_onboarding
-- had RLS auto-enabled by Supabase's platform event trigger but had no
-- policies, which blocked legitimate access entirely.
-- ============================================================

ALTER TABLE public.individual_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploration_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploration_trial_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exploration_reports ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- individual_onboarding (own only — personal onboarding answers)
-- -------------------------------------------------------
CREATE POLICY "individual_onboarding_select" ON public.individual_onboarding
  FOR SELECT TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "individual_onboarding_insert" ON public.individual_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "individual_onboarding_update" ON public.individual_onboarding
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- individual_consents (own only — legal/platform consent, sensitive)
-- -------------------------------------------------------
CREATE POLICY "individual_consents_select" ON public.individual_consents
  FOR SELECT TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "individual_consents_insert" ON public.individual_consents
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "individual_consents_update" ON public.individual_consents
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- exploration_consents (own only — per-exploration participation consent)
-- -------------------------------------------------------
CREATE POLICY "exploration_consents_select" ON public.exploration_consents
  FOR SELECT TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "exploration_consents_insert" ON public.exploration_consents
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "exploration_consents_update" ON public.exploration_consents
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

-- -------------------------------------------------------
-- exploration_trial_report_templates (catalog — public read, service_role writes)
-- -------------------------------------------------------
CREATE POLICY "catalog_select" ON public.exploration_trial_report_templates
  FOR SELECT TO anon, authenticated USING (true);

-- -------------------------------------------------------
-- user_exploration_reports (own only — generated report content)
-- -------------------------------------------------------
CREATE POLICY "user_exploration_reports_select" ON public.user_exploration_reports
  FOR SELECT TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "user_exploration_reports_insert" ON public.user_exploration_reports
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "user_exploration_reports_update" ON public.user_exploration_reports
  FOR UPDATE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())))
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));
