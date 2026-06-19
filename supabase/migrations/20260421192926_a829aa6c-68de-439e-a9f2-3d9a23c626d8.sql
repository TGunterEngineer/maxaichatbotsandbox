
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
    WHEN 'premium'   THEN 2147483647
  END
  FROM public.organizations
  WHERE id = _org_id
$function$;

CREATE OR REPLACE FUNCTION public.get_founder_spots()
 RETURNS TABLE(taken integer, total integer, remaining integer, is_open boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(c.cnt, 0)::int AS taken,
    10 AS total,
    GREATEST(10 - COALESCE(c.cnt, 0), 0)::int AS remaining,
    (COALESCE(c.cnt, 0) < 10) AS is_open
  FROM (
    SELECT COUNT(*)::int AS cnt
    FROM public.subscriptions
    WHERE stripe_price_id = 'founder_monthly'
      AND status IN ('active', 'trialing', 'past_due')
  ) c
$function$;

GRANT EXECUTE ON FUNCTION public.get_founder_spots() TO anon, authenticated;
