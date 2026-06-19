-- ============================================================
-- 1. AI USAGE LOG TABLE (token cost tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  session_id text,
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_log_org_created_idx
  ON public.ai_usage_log (organization_id, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role can insert AI usage"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. CHAT RATE LIMITS TABLE (sliding window)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  ip_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_rate_limits_window_idx
  ON public.chat_rate_limits (organization_id, ip_address, created_at DESC);

ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON public.chat_rate_limits FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. ALLOWED ORIGINS on organizations
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS allowed_origins text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 4. KB CHARACTER CAP per plan (token-cost guard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_org_kb_char_cap(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE plan_tier
    WHEN 'trial'     THEN 20000   -- ~5k tokens
    WHEN 'essential' THEN 40000   -- ~10k tokens
    WHEN 'growth'    THEN 80000   -- ~20k tokens
    WHEN 'founder'   THEN 80000
    WHEN 'premium'   THEN 200000  -- ~50k tokens
  END
  FROM public.organizations
  WHERE id = _org_id
$$;

-- ============================================================
-- 5. SLIDING-WINDOW RATE LIMIT CHECK
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_chat_rate_limit(
  _org_id uuid,
  _ip text,
  _max_requests integer DEFAULT 30,
  _window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Purge old entries opportunistically (keep table small)
  DELETE FROM public.chat_rate_limits
  WHERE created_at < now() - interval '1 hour';

  SELECT COUNT(*) INTO recent_count
  FROM public.chat_rate_limits
  WHERE organization_id = _org_id
    AND ip_address = _ip
    AND created_at > now() - (_window_seconds || ' seconds')::interval;

  IF recent_count >= _max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO public.chat_rate_limits (organization_id, ip_address)
  VALUES (_org_id, _ip);

  RETURN true;
END;
$$;

-- ============================================================
-- 6. LOCK DOWN handle_new_user — admin role only for configured email
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  assigned_role public.app_role;
  platform_admin_email text := 'admin@maximumaiconsulting.com';
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- ONLY the configured platform admin email gets admin role.
  -- Everyone else is a regular member regardless of signup order.
  assigned_role := CASE
    WHEN lower(NEW.email) = lower(platform_admin_email) THEN 'admin'::public.app_role
    ELSE 'member'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  INSERT INTO public.bot_configs (organization_id)
  VALUES (new_org_id);

  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');

  RETURN NEW;
END;
$$;