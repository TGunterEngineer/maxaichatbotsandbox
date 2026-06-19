-- Block non-admin members from changing billing columns on organizations
CREATE OR REPLACE FUNCTION public.prevent_billing_column_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role bypasses RLS entirely; this trigger runs for all updates.
  -- Allow if no auth user (service role / definer contexts pass NULL auth.uid()).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF (NEW.plan_tier IS DISTINCT FROM OLD.plan_tier)
     OR (NEW.plan_status IS DISTINCT FROM OLD.plan_status)
     OR (NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at) THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can modify billing fields (plan_tier, plan_status, trial_ends_at)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_block_billing_changes ON public.organizations;
CREATE TRIGGER organizations_block_billing_changes
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_billing_column_changes();