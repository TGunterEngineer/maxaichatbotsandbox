
-- Chat history table
CREATE TABLE public.chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Org members can view their chat history
CREATE POLICY "Users can view their org chat history"
  ON public.chat_history FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- Public widget can insert messages (using service role from edge function)
CREATE POLICY "Service can insert chat history"
  ON public.chat_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id)
  );

-- Index for fast lookups
CREATE INDEX idx_chat_history_org_session ON public.chat_history (organization_id, session_id, created_at);
