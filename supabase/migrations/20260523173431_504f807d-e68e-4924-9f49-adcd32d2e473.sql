
-- 1) Lock down founder reservation RPCs from anon/public
REVOKE EXECUTE ON FUNCTION public.reserve_founder_spot(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_founder_spot(uuid) FROM PUBLIC, anon, authenticated;

-- 2) Owner-only access to webhook_secret
CREATE OR REPLACE FUNCTION public.get_bot_webhook_secret(_org_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _secret text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Owner role required';
  END IF;

  SELECT webhook_secret INTO _secret
  FROM public.bot_configs
  WHERE organization_id = _org_id
  LIMIT 1;

  RETURN _secret;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_bot_webhook_secret(_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _new_secret text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Owner role required';
  END IF;

  _new_secret := encode(extensions.gen_random_bytes(32), 'hex');

  UPDATE public.bot_configs
  SET webhook_secret = _new_secret,
      updated_at = now()
  WHERE organization_id = _org_id;

  RETURN _new_secret;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_bot_webhook_secret(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rotate_bot_webhook_secret(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bot_webhook_secret(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_bot_webhook_secret(uuid) TO authenticated;
