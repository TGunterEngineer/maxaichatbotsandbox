CREATE OR REPLACE FUNCTION public.get_founder_spots()
 RETURNS TABLE(taken integer, total integer, remaining integer, is_open boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(c.cnt, 0)::int AS taken,
    10 AS total,
    GREATEST(10 - COALESCE(c.cnt, 0), 0)::int AS remaining,
    (COALESCE(c.cnt, 0) < 10) AS is_open
  FROM (
    -- Count DISTINCT organizations that have EVER held a founder subscription,
    -- regardless of current status. Once a founder spot is claimed, it is
    -- permanently consumed — cancellations do not free up the slot.
    SELECT COUNT(DISTINCT organization_id)::int AS cnt
    FROM public.subscriptions
    WHERE stripe_price_id = 'founder_monthly'
  ) c
$function$;