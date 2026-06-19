-- Explicitly deny INSERT/UPDATE/DELETE on user_roles for anon and authenticated roles.
-- Only service_role (which bypasses RLS) can write. This prevents privilege escalation.

CREATE POLICY "Block client inserts on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block client updates on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block client deletes on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);