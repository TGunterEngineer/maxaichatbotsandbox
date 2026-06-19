-- user_organizations: only org owners can manage memberships
CREATE POLICY "Org owners can insert memberships"
ON public.user_organizations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'owner'
  )
);

CREATE POLICY "Org owners can update memberships"
ON public.user_organizations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'owner'
  )
);

CREATE POLICY "Org owners can delete memberships"
ON public.user_organizations FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'owner'
  )
);

-- user_roles: only admins can manage roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));