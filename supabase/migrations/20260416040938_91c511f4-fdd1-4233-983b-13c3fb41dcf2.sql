DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.delete_organization(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_organizations
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Owner membership required';
  END IF;

  DELETE FROM public.chat_history WHERE organization_id = _org_id;
  DELETE FROM public.leads WHERE organization_id = _org_id;
  DELETE FROM public.bot_configs WHERE organization_id = _org_id;
  DELETE FROM public.profiles WHERE organization_id = _org_id;
  DELETE FROM public.user_organizations WHERE organization_id = _org_id;
  DELETE FROM public.organizations WHERE id = _org_id;
END;
$function$;