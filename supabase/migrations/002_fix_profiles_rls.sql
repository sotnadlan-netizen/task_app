-- =============================================================================
-- Fix profiles RLS: allow org members to see each other's profiles
-- Without this, joining org_memberships with profiles returns null for co-members
-- because the original policy only allowed viewing one's own profile.
-- =============================================================================

BEGIN;

-- Drop the old restrictive policy
DROP POLICY IF EXISTS profiles_select ON profiles;

-- New policy: see own profile OR profiles of people in the same org
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT om2.user_id
      FROM org_memberships om2
      WHERE om2.user_id IS NOT NULL
        AND om2.org_id IN (
          SELECT om1.org_id
          FROM org_memberships om1
          WHERE om1.user_id = auth.uid()
        )
    )
  );

COMMIT;
