-- =============================================================================
-- Per-user UI language preference (English / Hebrew)
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'he'));
