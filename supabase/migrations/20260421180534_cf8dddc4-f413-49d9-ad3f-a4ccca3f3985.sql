-- 1. Plan tier enum
CREATE TYPE public.plan_tier AS ENUM ('trial', 'essential', 'growth', 'premium');

-- 2. Add plan columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN plan_tier public.plan_tier NOT NULL DEFAULT 'growth',
  ADD COLUMN plan_status text NOT NULL DEFAULT 'active';

-- 3. Usage counters table — one row per org per month
CREATE TABLE public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  period_start date NOT NULL, -- first day of the month
  conversations_count integer NOT NULL DEFAULT 0,
  leads_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_start)
);

CREATE INDEX idx_usage_counters_org_period ON public.usage_counters (organization_id, period_start);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their usage"
  ON public.usage_counters FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- (no insert/update/delete policies — only edge functions via service role write)

CREATE TRIGGER update_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Quota lookup
CREATE OR REPLACE FUNCTION public.get_org_quota(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE plan_tier
    WHEN 'trial'     THEN 50
    WHEN 'essential' THEN 500
    WHEN 'growth'    THEN 2000
    WHEN 'premium'   THEN 2147483647 -- effectively unlimited
  END
  FROM public.organizations
  WHERE id = _org_id
$$;

-- 5. Current-month usage lookup
CREATE OR REPLACE FUNCTION public.get_org_usage(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(conversations_count, 0)
  FROM public.usage_counters
  WHERE organization_id = _org_id
    AND period_start = date_trunc('month', now())::date
$$;

-- 6. Increment usage — counts ONE conversation per unique session per month
CREATE OR REPLACE FUNCTION public.increment_org_usage(_org_id uuid, _session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period date := date_trunc('month', now())::date;
  _already_counted boolean;
BEGIN
  -- Check if this session already has any messages this month (means we already counted it)
  SELECT EXISTS (
    SELECT 1 FROM public.chat_history
    WHERE organization_id = _org_id
      AND session_id = _session_id
      AND created_at >= _period
  ) INTO _already_counted;

  IF _already_counted THEN
    RETURN;
  END IF;

  INSERT INTO public.usage_counters (organization_id, period_start, conversations_count)
  VALUES (_org_id, _period, 1)
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    conversations_count = public.usage_counters.conversations_count + 1,
    updated_at = now();
END;
$$;

-- 7. Allow admins to update org plan tier (for super admin page)
CREATE POLICY "Admins can update org plans"
  ON public.organizations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));