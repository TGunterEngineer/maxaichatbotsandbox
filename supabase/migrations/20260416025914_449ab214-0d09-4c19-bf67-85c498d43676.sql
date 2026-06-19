CREATE POLICY "Anon can read orgs for widget view"
ON public.organizations
FOR SELECT
TO anon
USING (true);