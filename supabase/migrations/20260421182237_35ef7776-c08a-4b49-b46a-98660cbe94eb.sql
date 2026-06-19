-- Subscriptions table — one active row per org per environment
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL, -- the user who initiated the checkout
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  stripe_price_id text, -- e.g. growth_monthly
  plan_tier public.plan_tier NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, trialing, past_due, canceled, incomplete, unpaid
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox', -- sandbox | live
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON public.subscriptions (organization_id);
CREATE INDEX idx_subscriptions_customer ON public.subscriptions (stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions (status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their subscription"
  ON public.subscriptions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- (no insert/update/delete — managed exclusively by webhook via service role)

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Billing status helper for the dashboard
CREATE OR REPLACE FUNCTION public.get_org_billing_status(_org_id uuid)
RETURNS TABLE (
  plan_tier public.plan_tier,
  plan_status text,
  subscription_status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  has_subscription boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.plan_tier,
    o.plan_status,
    s.status,
    s.current_period_end,
    COALESCE(s.cancel_at_period_end, false),
    (s.id IS NOT NULL)
  FROM public.organizations o
  LEFT JOIN LATERAL (
    SELECT * FROM public.subscriptions
    WHERE organization_id = o.id
    ORDER BY created_at DESC
    LIMIT 1
  ) s ON true
  WHERE o.id = _org_id
$$;