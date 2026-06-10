-- =============================================================================
-- Helpdesk: support tickets + system error monitoring
-- =============================================================================
-- Manual complaints (filed by any org member) and auto-logged unhandled errors
-- land in one org-scoped table surfaced on the admin dashboard in real time.

CREATE TYPE ticket_type     AS ENUM ('manual_complaint', 'system_error');
CREATE TYPE ticket_status   AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE tickets (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID            NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        ticket_type     NOT NULL DEFAULT 'manual_complaint',
  title       TEXT            NOT NULL,
  description TEXT            NOT NULL DEFAULT '',
  status      ticket_status   NOT NULL DEFAULT 'open',
  priority    ticket_priority NOT NULL DEFAULT 'medium',
  metadata    JSONB           NOT NULL DEFAULT '{}'::jsonb,   -- error stack trace / browser info
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_org     ON tickets(org_id);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);

-- Auto-update updated_at on any change (set_updated_at() defined in migration 005)
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- READ: a member sees their own tickets; org admins + platform admins see all org tickets
CREATE POLICY tickets_select ON tickets
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR is_platform_admin()
      OR org_id IN (
        SELECT org_id FROM org_memberships
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- INSERT: any org member may file a ticket for themselves (participants included)
CREATE POLICY tickets_insert ON tickets
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  );

-- UPDATE: org admins + platform admins only (status changes)
CREATE POLICY tickets_update ON tickets
  FOR UPDATE USING (
    is_platform_admin()
    OR org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Live updates for the admin dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
