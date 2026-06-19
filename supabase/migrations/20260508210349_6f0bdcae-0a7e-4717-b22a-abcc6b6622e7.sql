
ALTER TABLE public.organizations ALTER COLUMN plan_status SET DEFAULT 'inactive';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  assigned_role public.app_role;
  platform_admin_email text := 'admin@maximumaiconsulting.com';
  resolved_full_name text;
  resolved_company text;
  is_platform_admin boolean;
BEGIN
  resolved_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    ''
  );

  resolved_company := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
    CASE
      WHEN resolved_full_name <> '' THEN resolved_full_name || '''s Workspace'
      ELSE 'My Organization'
    END
  );

  is_platform_admin := lower(NEW.email) = lower(platform_admin_email);

  INSERT INTO public.organizations (name, plan_status)
  VALUES (resolved_company, CASE WHEN is_platform_admin THEN 'active' ELSE 'inactive' END)
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (NEW.id, new_org_id, resolved_full_name);

  assigned_role := CASE
    WHEN is_platform_admin THEN 'admin'::public.app_role
    ELSE 'member'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  INSERT INTO public.bot_configs (organization_id)
  VALUES (new_org_id);

  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');

  RETURN NEW;
END;
$function$;
