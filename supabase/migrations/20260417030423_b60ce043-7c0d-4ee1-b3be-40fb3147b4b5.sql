-- Fix privilege escalation on user_organizations:
-- Replace UPDATE policy so users cannot change their own membership row,
-- preventing self-escalation to 'owner'. Only OTHER owners in the same org
-- may modify a member's row. Also enforce allowed role values.

DROP POLICY IF EXISTS "Org owners can update memberships" ON public.user_organizations;

CREATE POLICY "Owners can update other members memberships"
ON public.user_organizations
FOR UPDATE
TO authenticated
USING (
  user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'owner'
  )
)
WITH CHECK (
  user_id <> auth.uid()
  AND role IN ('owner', 'member')
  AND EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role = 'owner'
  )
);
