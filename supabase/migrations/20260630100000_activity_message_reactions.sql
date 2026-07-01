CREATE TABLE IF NOT EXISTS public.activity_message_reactions (
  individual_id UUID NOT NULL REFERENCES public.individuals(id) ON DELETE CASCADE,
  activity_message_id UUID NOT NULL REFERENCES public.activity_messages(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'clap')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (individual_id, activity_message_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_message_reactions_message
  ON public.activity_message_reactions (activity_message_id);

ALTER TABLE public.activity_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_message_reactions_select" ON public.activity_message_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_message_reactions_insert" ON public.activity_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "activity_message_reactions_delete" ON public.activity_message_reactions
  FOR DELETE TO authenticated
  USING (individual_id = (SELECT id FROM public.individuals WHERE auth_user_id = (SELECT auth.uid())));

GRANT SELECT, INSERT, DELETE ON public.activity_message_reactions TO anon, authenticated;
