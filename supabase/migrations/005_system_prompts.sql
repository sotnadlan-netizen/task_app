-- =============================================================================
-- System Prompts (Platform-wide) + Org Prompt Selection + Task Deadline
-- =============================================================================

-- Helper: is_platform_admin() security definer function
-- Safe to call from RLS policies — reads platform_admins, never org_memberships
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- system_prompts: global prompts managed by platform admins
-- =============================================================================

CREATE TABLE system_prompts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  system_text TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_prompts_updated_at
  BEFORE UPDATE ON system_prompts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_system_prompts_created_at ON system_prompts(created_at DESC);

ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

-- Platform admins: full CRUD
CREATE POLICY system_prompts_platform_admin ON system_prompts
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- All authenticated users: SELECT (API layer filters out system_text for non-admins)
CREATE POLICY system_prompts_select ON system_prompts
  FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- organizations: add selected_prompt_id FK
-- =============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS selected_prompt_id UUID
  REFERENCES system_prompts(id) ON DELETE SET NULL;

-- =============================================================================
-- tasks: add deadline column
-- =============================================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deadline TEXT;
