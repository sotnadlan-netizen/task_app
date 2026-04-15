-- =============================================================================
-- Migration 005: Add projects table, project_id to sessions/tasks,
--                participant_ids to sessions, default_project_id to orgs
-- =============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_org ON projects(org_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_org_member ON projects FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = projects.org_id
        AND org_memberships.user_id = auth.uid()
    )
  );

-- Add project_id to sessions and tasks
ALTER TABLE sessions ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add participants array to sessions (store as jsonb array of user_ids)
ALTER TABLE sessions ADD COLUMN participant_ids UUID[] DEFAULT '{}';

-- Default project per org (used when no project selected)
ALTER TABLE organizations ADD COLUMN default_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
