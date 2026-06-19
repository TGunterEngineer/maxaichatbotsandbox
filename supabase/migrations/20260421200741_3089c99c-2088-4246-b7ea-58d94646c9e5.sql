
CREATE OR REPLACE FUNCTION public.get_org_lead_quota(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    CASE plan_tier
      WHEN 'trial'     THEN 10
      WHEN 'essential' THEN 100
      WHEN 'growth'    THEN 500
      WHEN 'founder'   THEN 500
      WHEN 'premium'   THEN 2147483647
      ELSE 50
    END,
    50
  )
  FROM public.organizations
  WHERE id = _org_id
$$;
