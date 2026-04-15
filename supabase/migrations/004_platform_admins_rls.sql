-- =============================================================================
-- Platform Admins — Table + RLS
-- =============================================================================

-- Create table if it was not already created manually
CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Ensure RLS is enabled on platform_admins
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read their own row
CREATE POLICY platform_admins_select ON platform_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No one can insert/update/delete via client — only via service_role (backend)
CREATE POLICY platform_admins_no_insert ON platform_admins
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY platform_admins_no_update ON platform_admins
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY platform_admins_no_delete ON platform_admins
  FOR DELETE TO authenticated
  USING (false);
