
CREATE OR REPLACE FUNCTION public.get_org_lead_quota(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE plan_tier
    WHEN 'trial'     THEN 10
    WHEN 'essential' THEN 100
    WHEN 'growth'    THEN 500
    WHEN 'founder'   THEN 500
    WHEN 'premium'   THEN 2147483647
  END
  FROM public.organizations
  WHERE id = _org_id
$$;

CREATE OR REPLACE FUNCTION public.get_org_leads_usage(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(leads_count, 0)
  FROM public.usage_counters
  WHERE organization_id = _org_id
    AND period_start = date_trunc('month', now())::date
$$;
