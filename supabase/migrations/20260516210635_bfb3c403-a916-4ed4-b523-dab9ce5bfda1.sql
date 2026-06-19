
-- Revoke EXECUTE from public roles on all SECURITY DEFINER functions in public schema,
-- then grant back only to authenticated for the ones the frontend RPCs actually call.
-- Triggers and edge functions (service_role) are unaffected.

DO $$
DECLARE
  r record;
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
END $$;

-- Re-grant EXECUTE to authenticated for frontend-callable RPCs
GRANT EXECUTE ON FUNCTION public.get_org_billing_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_has_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_kb_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_leads_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_seats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_summaries(uuid, integer, integer) TO authenticated;
