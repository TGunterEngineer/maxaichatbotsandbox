CREATE OR REPLACE FUNCTION public.get_session_summaries(
  _org_id uuid,
  _limit int DEFAULT 20,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  session_id text,
  message_count integer,
  first_message_at timestamptz,
  last_message_at timestamptz,
  first_message_content text,
  associated_lead_email text,
  total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      ch.session_id,
      COUNT(*)::int AS message_count,
      MIN(ch.created_at) AS first_message_at,
      MAX(ch.created_at) AS last_message_at,
      (
        SELECT content FROM public.chat_history ch2
        WHERE ch2.organization_id = ch.organization_id
          AND ch2.session_id = ch.session_id
          AND ch2.role = 'user'
        ORDER BY ch2.created_at ASC
        LIMIT 1
      ) AS first_user_content,
      (
        SELECT content FROM public.chat_history ch3
        WHERE ch3.organization_id = ch.organization_id
          AND ch3.session_id = ch.session_id
        ORDER BY ch3.created_at ASC
        LIMIT 1
      ) AS first_any_content
    FROM public.chat_history ch
    WHERE ch.organization_id = _org_id
      AND public.is_org_member(auth.uid(), _org_id)
    GROUP BY ch.session_id, ch.organization_id
  ),
  with_lead AS (
    SELECT
      b.session_id,
      b.message_count,
      b.first_message_at,
      b.last_message_at,
      COALESCE(b.first_user_content, b.first_any_content) AS first_message_content,
      (
        SELECT l.email FROM public.leads l
        WHERE l.organization_id = _org_id
          AND l.session_id = b.session_id
        ORDER BY l.created_at ASC
        LIMIT 1
      ) AS associated_lead_email
    FROM base b
  ),
  counted AS (
    SELECT *, COUNT(*) OVER ()::bigint AS total_count
    FROM with_lead
  )
  SELECT
    session_id,
    message_count,
    first_message_at,
    last_message_at,
    first_message_content,
    associated_lead_email,
    total_count
  FROM counted
  ORDER BY last_message_at DESC
  LIMIT GREATEST(_limit, 1)
  OFFSET GREATEST(_offset, 0);
$$;