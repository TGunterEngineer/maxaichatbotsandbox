
DROP POLICY "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads with valid org"
  ON public.leads FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id)
  );
