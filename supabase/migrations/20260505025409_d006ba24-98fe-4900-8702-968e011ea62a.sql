REVOKE EXECUTE ON FUNCTION public.get_session_summaries(uuid, int, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_session_summaries(uuid, int, int) TO authenticated;