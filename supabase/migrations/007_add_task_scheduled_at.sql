-- Structured scheduled time for tasks (calendar placement).
-- Free-text `deadline` stays as the human-readable display string.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_org_scheduled_at
  ON tasks (org_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;
