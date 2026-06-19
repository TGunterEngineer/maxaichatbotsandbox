CREATE OR REPLACE FUNCTION public.org_has_feature(_org_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _feature
    -- SMS hot-lead alerts: Growth, Founder, Premium
    WHEN 'sms_alerts' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    -- After-hours mode: Growth, Founder, Premium
    WHEN 'after_hours' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    -- Missed-chat follow-up emails: Growth, Founder, Premium
    WHEN 'missed_chat_followup' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    -- Weekly digest emails: Growth, Founder, Premium
    WHEN 'weekly_digest' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    -- Multilingual: Premium only (Founder also gets it as a perk)
    WHEN 'multilingual' THEN
      (SELECT plan_tier IN ('founder','premium') FROM public.organizations WHERE id = _org_id)
    ELSE false
  END
$$;