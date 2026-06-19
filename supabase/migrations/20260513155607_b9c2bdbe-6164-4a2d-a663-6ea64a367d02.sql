CREATE OR REPLACE FUNCTION public.org_has_feature(_org_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    WHEN 'booking_link' THEN
      (SELECT plan_tier IN ('essential','growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'google_business' THEN
      (SELECT plan_tier IN ('essential','growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    -- Advanced webhooks: Premium-only gate
    WHEN 'webhook' THEN
      (SELECT plan_tier = 'premium' FROM public.organizations WHERE id = _org_id)
    WHEN 'analytics_charts' THEN
      (SELECT plan_tier IN ('growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    WHEN 'white_label' THEN
      (SELECT plan_tier = 'premium' FROM public.organizations WHERE id = _org_id)
    WHEN 'multi_kb' THEN
      (SELECT plan_tier IN ('essential','growth','founder','premium') FROM public.organizations WHERE id = _org_id)
    ELSE false
  END
$function$;