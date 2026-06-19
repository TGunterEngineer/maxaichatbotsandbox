CREATE POLICY "Service can update leads with valid org"
ON public.leads
FOR UPDATE
USING (EXISTS (SELECT 1 FROM organizations WHERE organizations.id = leads.organization_id))
WITH CHECK (EXISTS (SELECT 1 FROM organizations WHERE organizations.id = leads.organization_id));