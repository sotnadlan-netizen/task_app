-- =============================================================================
-- Per-org prompt curation: which system prompts each org may choose from,
-- plus tracking which prompt produced each session.
-- =============================================================================

-- =============================================================================
-- org_system_prompts: join table linking organizations to the system prompts
-- the platform admin has made available to them.
-- =============================================================================

CREATE TABLE org_system_prompts (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_id  UUID        NOT NULL REFERENCES system_prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, prompt_id)
);

CREATE INDEX idx_org_system_prompts_org ON org_system_prompts(org_id);

ALTER TABLE org_system_prompts ENABLE ROW LEVEL SECURITY;

-- Platform admins: full CRUD (manage which prompts each org gets)
CREATE POLICY org_system_prompts_platform_admin ON org_system_prompts
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Org members: may read their own org's assignments to see the available choices.
-- (system_text is never exposed here — only the assignment rows.)
CREATE POLICY org_system_prompts_select ON org_system_prompts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = org_system_prompts.org_id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- =============================================================================
-- sessions: record which system prompt produced the session
-- =============================================================================

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS system_prompt_id UUID
  REFERENCES system_prompts(id) ON DELETE SET NULL;
