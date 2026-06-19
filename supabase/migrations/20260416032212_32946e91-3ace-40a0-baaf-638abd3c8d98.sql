
CREATE OR REPLACE FUNCTION public.delete_organization(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Delete related data
  DELETE FROM public.chat_history WHERE organization_id = _org_id;
  DELETE FROM public.leads WHERE organization_id = _org_id;
  DELETE FROM public.bot_configs WHERE organization_id = _org_id;
  DELETE FROM public.profiles WHERE organization_id = _org_id;
  DELETE FROM public.user_organizations WHERE organization_id = _org_id;
  DELETE FROM public.organizations WHERE id = _org_id;
END;
$$;
