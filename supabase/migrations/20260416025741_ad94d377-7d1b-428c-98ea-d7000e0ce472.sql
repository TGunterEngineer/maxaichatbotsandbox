-- Fix 1: Tighten leads UPDATE policy
DROP POLICY "Service can update leads with valid org" ON public.leads;

CREATE POLICY "Org members can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (is_org_member(auth.uid(), organization_id))
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Fix 2: Remove self-serve org membership INSERT (privilege escalation risk)
DROP POLICY "Users can insert memberships for themselves" ON public.user_organizations;