CREATE TABLE IF NOT EXISTS public.shared_ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL,
  application_source text NOT NULL,
  prompt_text text NOT NULL,
  response_text text NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_ai_cache_query_hash
  ON public.shared_ai_cache (query_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_ai_cache_created_at
  ON public.shared_ai_cache (created_at DESC);

ALTER TABLE public.shared_ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages shared ai cache"
  ON public.shared_ai_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.increment_shared_ai_cache_hit(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shared_ai_cache
  SET hit_count = hit_count + 1,
      last_hit_at = now()
  WHERE id = _id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_shared_ai_cache_hit(uuid) FROM PUBLIC, anon, authenticated;