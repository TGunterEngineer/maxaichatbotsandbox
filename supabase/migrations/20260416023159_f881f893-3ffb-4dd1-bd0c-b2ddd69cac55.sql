
-- 1. Create user_organizations junction table
CREATE TABLE public.user_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships"
  ON public.user_organizations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert memberships for themselves"
  ON public.user_organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2. Create is_org_member security definer function
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- 3. Backfill existing profiles into user_organizations
INSERT INTO public.user_organizations (user_id, organization_id, role)
SELECT user_id, organization_id, 'owner'
FROM public.profiles
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 4. Update handle_new_user to also insert into user_organizations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  INSERT INTO public.bot_configs (organization_id)
  VALUES (new_org_id);

  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');

  RETURN NEW;
END;
$$;

-- 5. Update RLS on bot_configs to use is_org_member
DROP POLICY IF EXISTS "Users can view their org bot configs" ON public.bot_configs;
CREATE POLICY "Users can view their org bot configs"
  ON public.bot_configs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Users can update their org bot configs" ON public.bot_configs;
CREATE POLICY "Users can update their org bot configs"
  ON public.bot_configs FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Users can insert bot configs for their org" ON public.bot_configs;
CREATE POLICY "Users can insert bot configs for their org"
  ON public.bot_configs FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- 6. Update RLS on organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organizations"
  ON public.organizations FOR SELECT
  USING (is_org_member(auth.uid(), id));

DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
CREATE POLICY "Users can update their own organizations"
  ON public.organizations FOR UPDATE
  USING (is_org_member(auth.uid(), id));

-- Allow anon read for widget embed (org name/color lookup)
CREATE POLICY "Anyone can read org for widget"
  ON public.organizations FOR SELECT TO anon
  USING (true);

-- 7. Update RLS on leads
DROP POLICY IF EXISTS "Users can view their org leads" ON public.leads;
CREATE POLICY "Users can view their org leads"
  ON public.leads FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- 8. Update RLS on chat_history
DROP POLICY IF EXISTS "Users can view their org chat history" ON public.chat_history;
CREATE POLICY "Users can view their org chat history"
  ON public.chat_history FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- 9. Allow users to insert organizations (for creating new client orgs)
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);
