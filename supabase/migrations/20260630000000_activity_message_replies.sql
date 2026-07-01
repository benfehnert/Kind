ALTER TABLE public.activity_messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.activity_messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_activity_messages_post ON public.activity_messages (activity_post_id);
CREATE INDEX IF NOT EXISTS idx_activity_messages_parent ON public.activity_messages (parent_message_id);
