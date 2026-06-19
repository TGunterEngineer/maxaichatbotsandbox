
-- 1) Knowledge base source limit per tier
CREATE OR REPLACE FUNCTION public.get_org_kb_limit(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE plan_tier
    WHEN 'trial'     THEN 1
    WHEN 'essential' THEN 5
    WHEN 'growth'    THEN 25
    WHEN 'founder'   THEN 25
    WHEN 'premium'   THEN 2147483647
  END
  FROM public.organizations
  WHERE id = _org_id
$$;

-- 2) Extend org_has_feature with new gated features
CREATE OR REPLACE FUNCTION public.org_has_feature(_org_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE _feature
    WHEN 'sms_alerts' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'after_hours' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'missed_chat_followup' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'weekly_digest' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'multilingual' THEN
      (SELECT plan_tier IN ('founder','premium') FROM public.organizations WHERE id = _org_id)
    -- New gates
    WHEN 'booking_link' THEN
      (SELECT plan_tier IN ('essential','growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'google_business' THEN
      (SELECT plan_tier IN ('essential','growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'webhook' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'analytics_charts' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'white_label' THEN
      (SELECT plan_tier = 'premium' FROM public.organizations WHERE id = _org_id)
    WHEN 'multi_kb' THEN
      (SELECT plan_tier IN ('essential','growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    ELSE false
  END
$$;

-- 3) Trial tracking + 7-day window
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill: any existing 'trial' org gets 7 days from now (one-time grace)
UPDATE public.organizations
SET trial_ends_at = now() + interval '7 days'
WHERE plan_tier = 'trial' AND trial_ends_at IS NULL;

-- New trial orgs default to 7 days from creation
CREATE OR REPLACE FUNCTION public.set_trial_ends_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.plan_tier = 'trial' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_set_trial_ends_at ON public.organizations;
CREATE TRIGGER organizations_set_trial_ends_at
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_trial_ends_at();

-- Helper to check trial status from app code
CREATE OR REPLACE FUNCTION public.get_org_trial_status(_org_id uuid)
RETURNS TABLE(is_trial boolean, trial_ends_at timestamptz, days_remaining integer, expired boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (plan_tier = 'trial') AS is_trial,
    trial_ends_at,
    GREATEST(0, EXTRACT(DAY FROM (trial_ends_at - now()))::int) AS days_remaining,
    (plan_tier = 'trial' AND trial_ends_at IS NOT NULL AND trial_ends_at < now()) AS expired
  FROM public.organizations
  WHERE id = _org_id
$$;
