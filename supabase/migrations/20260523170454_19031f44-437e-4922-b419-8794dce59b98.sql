
-- Pending checkouts table
CREATE TABLE IF NOT EXISTS public.founder_pending_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founder_pending_active
  ON public.founder_pending_checkouts (expires_at);

ALTER TABLE public.founder_pending_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages founder pending checkouts"
  ON public.founder_pending_checkouts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Atomic reserve function
CREATE OR REPLACE FUNCTION public.reserve_founder_spot(
  _org_id uuid,
  _user_id uuid,
  _ttl_minutes integer DEFAULT 15
)
RETURNS TABLE(reserved boolean, reservation_id uuid, taken integer, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _taken int;
  _new_id uuid;
  _limit constant int := 10;
BEGIN
  -- Serialize all founder reservation attempts via a single advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('founder_tier_global'));

  -- Purge expired pending rows opportunistically
  DELETE FROM public.founder_pending_checkouts
  WHERE expires_at < now();

  SELECT
    (
      SELECT COUNT(DISTINCT organization_id)::int
      FROM public.subscriptions
      WHERE stripe_price_id = 'founder_monthly'
    )
    +
    (
      SELECT COUNT(*)::int
      FROM public.founder_pending_checkouts
      WHERE expires_at > now()
    )
  INTO _taken;

  IF _taken >= _limit THEN
    reserved := false;
    reservation_id := NULL;
    taken := _taken;
    total := _limit;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.founder_pending_checkouts (organization_id, user_id, expires_at)
  VALUES (_org_id, _user_id, now() + (_ttl_minutes || ' minutes')::interval)
  RETURNING id INTO _new_id;

  reserved := true;
  reservation_id := _new_id;
  taken := _taken + 1;
  total := _limit;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_founder_spot(_reservation_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.founder_pending_checkouts WHERE id = _reservation_id;
$$;

-- Update get_founder_spots to include active pending reservations
CREATE OR REPLACE FUNCTION public.get_founder_spots()
RETURNS TABLE(taken integer, total integer, remaining integer, is_open boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT
      (
        SELECT COUNT(DISTINCT organization_id)::int
        FROM public.subscriptions
        WHERE stripe_price_id = 'founder_monthly'
      )
      +
      (
        SELECT COUNT(*)::int
        FROM public.founder_pending_checkouts
        WHERE expires_at > now()
      ) AS cnt
  )
  SELECT
    LEAST(c.cnt, 10) AS taken,
    10 AS total,
    GREATEST(10 - c.cnt, 0) AS remaining,
    (c.cnt < 10) AS is_open
  FROM counts c;
$$;
