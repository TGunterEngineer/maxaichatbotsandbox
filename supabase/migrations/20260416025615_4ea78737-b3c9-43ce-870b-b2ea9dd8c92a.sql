-- Drop the old permissive INSERT policies
DROP POLICY "Anyone can insert leads with valid org" ON public.leads;
DROP POLICY "Service can insert chat history" ON public.chat_history;

-- Tightened: only org members can insert leads
CREATE POLICY "Org members can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Tightened: only org members can insert chat history
CREATE POLICY "Org members can insert chat history"
ON public.chat_history
FOR INSERT
TO authenticated
WITH CHECK (is_org_member(auth.uid(), organization_id));