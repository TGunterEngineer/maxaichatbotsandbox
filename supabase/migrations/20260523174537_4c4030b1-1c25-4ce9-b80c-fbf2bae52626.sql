
ALTER TABLE public.usage_counters
  ADD COLUMN IF NOT EXISTS sms_alerts_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_org_sms_cap(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE plan_tier
    WHEN 'growth'  THEN 50
    WHEN 'founder' THEN 50
    WHEN 'premium' THEN 150
    ELSE 0
  END
  FROM public.organizations
  WHERE id = _org_id
$$;

CREATE OR REPLACE FUNCTION public.get_org_sms_usage(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sms_alerts_count, 0)
  FROM public.usage_counters
  WHERE organization_id = _org_id
    AND period_start = date_trunc('month', now())::date
$$;

CREATE OR REPLACE FUNCTION public.increment_org_sms_alerts(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO public.usage_counters (organization_id, period_start, sms_alerts_count)
  VALUES (_org_id, _period, 1)
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    sms_alerts_count = public.usage_counters.sms_alerts_count + 1,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_org_sms_alerts(uuid) FROM PUBLIC, anon, authenticated;
