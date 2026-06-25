
-- 1) Hide webhook_secret from non-owners via column-level grants
REVOKE SELECT ON public.bot_configs FROM anon, authenticated;
GRANT SELECT (
  id, organization_id, bot_name, welcome_message, system_prompt, primary_knowledge,
  created_at, updated_at, tone, webhook_url, ask_for_preferred_time, booking_link,
  sms_alert_phone, business_hours_enabled, business_hours_timezone, business_hours_start,
  business_hours_end, business_hours_days, after_hours_message, multilingual_enabled,
  is_active, support_email
) ON public.bot_configs TO authenticated;

-- 2) chat_history: explicit service_role insert policy
DROP POLICY IF EXISTS "service_role can insert chat history" ON public.chat_history;
CREATE POLICY "service_role can insert chat history"
ON public.chat_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3) chat_summaries: service_role insert/update policies
DROP POLICY IF EXISTS "service_role can insert chat summaries" ON public.chat_summaries;
CREATE POLICY "service_role can insert chat summaries"
ON public.chat_summaries
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role can update chat summaries" ON public.chat_summaries;
CREATE POLICY "service_role can update chat summaries"
ON public.chat_summaries
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 4) leads: explicit service_role insert policy
DROP POLICY IF EXISTS "service_role can insert leads" ON public.leads;
CREATE POLICY "service_role can insert leads"
ON public.leads
FOR INSERT
TO service_role
WITH CHECK (true);

-- 5) Move pg_net out of public schema by recreating it in extensions
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 6) Lock down SECURITY DEFINER functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;
END$$;

GRANT EXECUTE ON FUNCTION public.delete_organization(uuid)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bot_webhook_secret(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_founder_spots()                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_billing_status(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_kb_char_cap(uuid)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_kb_limit(uuid)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_lead_quota(uuid)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_leads_usage(uuid)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_quota(uuid)                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_seat_limit(uuid)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_seats(uuid)                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_sms_cap(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_sms_usage(uuid)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_trial_status(uuid)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_usage(uuid)                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_summaries(uuid, integer, integer)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_id(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_has_feature(uuid, text)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_founder_spot(uuid)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_founder_spot(uuid, uuid, integer)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_bot_webhook_secret(uuid)                 TO authenticated;
