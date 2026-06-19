
-- 1. Update conversation quota: Premium now capped at 10,000/mo
CREATE OR REPLACE FUNCTION public.get_org_quota(_org_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE plan_tier
    WHEN 'trial'     THEN 50
    WHEN 'essential' THEN 500
    WHEN 'growth'    THEN 2000
    WHEN 'founder'   THEN 2000
    WHEN 'premium'   THEN 10000
  END
  FROM public.organizations
  WHERE id = _org_id
$function$;

-- 2. Effectively remove lead caps (very high ceiling, kept for defense-in-depth against runaway loops)
CREATE OR REPLACE FUNCTION public.get_org_lead_quota(_org_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 2147483647
$function$;

-- 3. Seat limit per plan
CREATE OR REPLACE FUNCTION public.get_org_seat_limit(_org_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE plan_tier
    WHEN 'trial'     THEN 1
    WHEN 'essential' THEN 1
    WHEN 'growth'    THEN 3
    WHEN 'founder'   THEN 3
    WHEN 'premium'   THEN 2147483647
  END
  FROM public.organizations
  WHERE id = _org_id
$function$;

-- 4. Current seat count + limit for an organization
CREATE OR REPLACE FUNCTION public.get_org_seats(_org_id uuid)
 RETURNS TABLE(used integer, seat_limit integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT COUNT(*)::int FROM public.user_organizations WHERE organization_id = _org_id) AS used,
    public.get_org_seat_limit(_org_id) AS seat_limit
$function$;
