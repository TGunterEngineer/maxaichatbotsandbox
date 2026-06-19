-- 1) Enforce KB source count limit on insert
CREATE OR REPLACE FUNCTION public.enforce_kb_source_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_allowed integer;
BEGIN
  SELECT public.get_org_kb_limit(NEW.organization_id) INTO max_allowed;

  -- Unlimited (premium) — fast path
  IF max_allowed IS NULL OR max_allowed >= 2147483647 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int INTO current_count
  FROM public.kb_sources
  WHERE organization_id = NEW.organization_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Knowledge base limit reached: your plan allows % source(s). Upgrade to add more.', max_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_kb_source_limit ON public.kb_sources;
CREATE TRIGGER trg_enforce_kb_source_limit
BEFORE INSERT ON public.kb_sources
FOR EACH ROW EXECUTE FUNCTION public.enforce_kb_source_limit();


-- 2) Enforce seat limit on user_organizations insert
CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_allowed integer;
BEGIN
  SELECT public.get_org_seat_limit(NEW.organization_id) INTO max_allowed;

  IF max_allowed IS NULL OR max_allowed >= 2147483647 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int INTO current_count
  FROM public.user_organizations
  WHERE organization_id = NEW.organization_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Seat limit reached: your plan allows % user seat(s). Upgrade to add more teammates.', max_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_seat_limit ON public.user_organizations;
CREATE TRIGGER trg_enforce_seat_limit
BEFORE INSERT ON public.user_organizations
FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit();


-- 3) Enforce multilingual feature gate on bot_configs
CREATE OR REPLACE FUNCTION public.enforce_multilingual_feature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.multilingual_enabled = true
     AND (TG_OP = 'INSERT' OR OLD.multilingual_enabled IS DISTINCT FROM NEW.multilingual_enabled) THEN
    IF NOT public.org_has_feature(NEW.organization_id, 'multilingual') THEN
      RAISE EXCEPTION 'Multilingual support requires the Founder or Premium plan.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_multilingual_feature ON public.bot_configs;
CREATE TRIGGER trg_enforce_multilingual_feature
BEFORE INSERT OR UPDATE ON public.bot_configs
FOR EACH ROW EXECUTE FUNCTION public.enforce_multilingual_feature();