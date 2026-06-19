ALTER TABLE public.bot_configs
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_chat_context_and_limits(_org_id uuid, _session_id text, _ip text, _max_requests integer DEFAULT 30, _window_seconds integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tier plan_tier;
  _allowed boolean;
  _kb_cap int;
  _quota int;
  _usage int;
  _trial_ends timestamptz;
  _is_trial boolean;
  _expired boolean;
  _session_exists boolean;
  _kb_parts jsonb;
  _features jsonb;
  _is_active boolean;
  _period_start timestamptz := date_trunc('month', now());
BEGIN
  -- 1) Rate limit check (also inserts a row on success)
  SELECT public.check_chat_rate_limit(_org_id, _ip, _max_requests, _window_seconds) INTO _allowed;
  IF _allowed = false THEN
    RETURN jsonb_build_object('rate_limited', true);
  END IF;

  -- 2) Plan tier + trial info
  SELECT plan_tier, trial_ends_at INTO _tier, _trial_ends
  FROM public.organizations
  WHERE id = _org_id;

  IF _tier IS NULL THEN
    RETURN jsonb_build_object('rate_limited', false, 'org_not_found', true);
  END IF;

  _is_trial := (_tier = 'trial');
  _expired := (_is_trial AND _trial_ends IS NOT NULL AND _trial_ends < now());

  -- 2b) Kill switch
  SELECT COALESCE(is_active, true) INTO _is_active
  FROM public.bot_configs
  WHERE organization_id = _org_id;
  _is_active := COALESCE(_is_active, true);

  -- 3) Plan-tier matrix
  _kb_cap := CASE _tier
    WHEN 'trial'     THEN 20000
    WHEN 'essential' THEN 40000
    WHEN 'growth'    THEN 80000
    WHEN 'founder'   THEN 80000
    WHEN 'premium'   THEN 200000
  END;

  _quota := CASE _tier
    WHEN 'trial'     THEN 50
    WHEN 'essential' THEN 500
    WHEN 'growth'    THEN 2000
    WHEN 'founder'   THEN 2000
    WHEN 'premium'   THEN 10000
  END;

  _features := jsonb_build_object(
    'sms_alerts',   _tier IN ('growth','founder','premium'),
    'after_hours',  _tier IN ('growth','founder','premium'),
    'multilingual', _tier IN ('founder','premium'),
    'booking_link', _tier IN ('essential','growth','founder','premium'),
    'webhook',      _tier IN ('growth','founder','premium')
  );

  -- 4) Monthly usage
  SELECT COALESCE(conversations_count, 0) INTO _usage
  FROM public.usage_counters
  WHERE organization_id = _org_id
    AND period_start = _period_start::date;
  _usage := COALESCE(_usage, 0);

  -- 5) Has this session sent any messages this month?
  SELECT EXISTS (
    SELECT 1 FROM public.chat_history
    WHERE organization_id = _org_id
      AND session_id = _session_id
      AND created_at >= _period_start
  ) INTO _session_exists;

  -- 6) KB content
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('label', label, 'content', content) ORDER BY created_at),
    '[]'::jsonb
  )
  INTO _kb_parts
  FROM public.kb_sources
  WHERE organization_id = _org_id
    AND content IS NOT NULL
    AND length(content) > 0;

  RETURN jsonb_build_object(
    'rate_limited', false,
    'plan_tier', _tier,
    'features', _features,
    'kb_cap', _kb_cap,
    'kb_sources', _kb_parts,
    'quota', _quota,
    'usage', _usage,
    'is_active', _is_active,
    'trial', jsonb_build_object(
      'is_trial', _is_trial,
      'expired', COALESCE(_expired, false),
      'trial_ends_at', _trial_ends
    ),
    'session_exists_this_month', _session_exists
  );
END;
$function$;