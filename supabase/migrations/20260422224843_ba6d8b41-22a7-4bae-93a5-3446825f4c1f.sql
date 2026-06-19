ALTER TABLE public.bot_configs
  ADD COLUMN IF NOT EXISTS sms_alert_phone TEXT;

CREATE TABLE IF NOT EXISTS public.session_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  session_id text NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, session_id)
);

ALTER TABLE public.session_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view session followups"
  ON public.session_followups FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE TABLE IF NOT EXISTS public.weekly_digests_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  week_start date NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, week_start, recipient_email)
);

ALTER TABLE public.weekly_digests_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view weekly digests"
  ON public.weekly_digests_sent FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_chat_history_org_session_created
  ON public.chat_history (organization_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_org_session
  ON public.leads (organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_session_followups_org_session
  ON public.session_followups (organization_id, session_id);