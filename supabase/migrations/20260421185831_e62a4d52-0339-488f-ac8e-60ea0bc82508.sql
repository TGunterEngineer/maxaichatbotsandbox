CREATE OR REPLACE FUNCTION public.increment_org_leads(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _period date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO public.usage_counters (organization_id, period_start, leads_count)
  VALUES (_org_id, _period, 1)
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    leads_count = public.usage_counters.leads_count + 1,
    updated_at = now();
END;
$$;