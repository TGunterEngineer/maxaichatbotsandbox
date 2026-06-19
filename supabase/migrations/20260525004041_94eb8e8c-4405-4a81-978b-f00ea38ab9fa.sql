
-- 1) Hide webhook_secret from direct client SELECT; keep RPC-based access for owners
REVOKE SELECT (webhook_secret) ON public.bot_configs FROM anon, authenticated;

-- 2) Remove subscriptions from realtime publication (sensitive billing data)
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;

-- 3) Add UPDATE policy on kb-files storage bucket mirroring INSERT/DELETE
CREATE POLICY "Org members update kb files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kb-files'
  AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'kb-files'
  AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 4) Revoke EXECUTE from anon on SECURITY DEFINER helper functions that should
--    never be callable without authentication. Edge functions use service_role
--    and authenticated users retain access.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_org_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_bot_webhook_secret(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rotate_bot_webhook_secret(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_organization(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_conversation_topup(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_org_leads(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_org_sms_alerts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_org_usage(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_shared_ai_cache_hit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_billing_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_kb_char_cap(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_kb_limit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_lead_quota(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_leads_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_quota(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_seat_limit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_seats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_sms_cap(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_sms_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_trial_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_session_summaries(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.org_has_feature(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserve_founder_spot(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_founder_spot(uuid) FROM anon;
