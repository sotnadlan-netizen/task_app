-- =============================================================================
-- Helpdesk: per-ticket chat threads + platform-admin cross-org ticket access
-- =============================================================================

-- ── 1. Let platform admins read tickets across ALL organizations ─────────────
-- The original tickets_select (migration 010) gated everything behind org
-- membership, so a platform admin who isn't a member of an org couldn't see its
-- tickets. The global dashboard needs cross-org read, so platform admins are
-- now allowed first, before the org-scoped branch.
DROP POLICY IF EXISTS tickets_select ON tickets;

CREATE POLICY tickets_select ON tickets
  FOR SELECT USING (
    is_platform_admin()
    OR (
      org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND (
        user_id = auth.uid()
        OR org_id IN (
          SELECT org_id FROM org_memberships
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- ── 2. ticket_messages: chat thread on each ticket ───────────────────────────
CREATE TABLE ticket_messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id  UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket  ON ticket_messages(ticket_id, created_at);
CREATE INDEX idx_ticket_messages_org     ON ticket_messages(org_id);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- A message is visible to anyone who can see its parent ticket:
-- platform admins (any), the ticket's author, or an admin of the ticket's org.
CREATE POLICY ticket_messages_select ON ticket_messages
  FOR SELECT USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.org_id IN (
            SELECT org_id FROM org_memberships
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- Same audience may post — always as themselves.
CREATE POLICY ticket_messages_insert ON ticket_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_messages.ticket_id
          AND (
            t.user_id = auth.uid()
            OR t.org_id IN (
              SELECT org_id FROM org_memberships
              WHERE user_id = auth.uid() AND role = 'admin'
            )
          )
      )
    )
  );

-- Live chat updates
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
