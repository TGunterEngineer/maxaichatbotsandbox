-- Drop the overly permissive anon SELECT policy on organizations
DROP POLICY IF EXISTS "Anon can read orgs for widget view" ON public.organizations;