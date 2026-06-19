CREATE TABLE IF NOT EXISTS public.chat_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  session_id text NOT NULL,
  summary text NOT NULL,
  message_count_at_summary integer NOT NULL DEFAULT 0,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_summaries_org_session
  ON public.chat_summaries (organization_id, session_id);

ALTER TABLE public.chat_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their chat summaries"
  ON public.chat_summaries
  FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Inserts/updates/deletes only via service role (edge functions).
-- No client INSERT/UPDATE/DELETE policies = effectively blocked for anon/authenticated.

CREATE TRIGGER chat_summaries_set_updated_at
  BEFORE UPDATE ON public.chat_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();