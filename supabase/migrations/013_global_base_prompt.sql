-- =============================================================================
-- Two-tier prompt model:
--   GLOBAL BASE prompt  (this migration)  — one platform-wide "how to do the job"
--                                            prompt, editable only by platform admins.
--   MISSION prompts     (system_prompts)  — already exist; layered ON TOP of the base.
--
-- Also removes org-admin-authored prompt_versions: org admins no longer write raw
-- prompt text — they only pick a mission headline assigned by the platform admin.
-- =============================================================================

-- =============================================================================
-- global_base_prompts: single-row table holding the platform-wide base prompt.
-- If no row exists (or system_text is empty), the backend falls back to the
-- DEFAULT_SYSTEM_PROMPT constant in app/services/gemini.py.
-- =============================================================================

CREATE TABLE global_base_prompts (
  id          INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce a single row
  system_text TEXT        NOT NULL,
  updated_by  UUID        REFERENCES profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE global_base_prompts ENABLE ROW LEVEL SECURITY;

-- Platform admins only — full CRUD. The base text is never exposed to org users.
-- (The backend reads it with the service_role key during audio processing, which
--  bypasses RLS, so org users never need DB read access here.)
CREATE POLICY global_base_prompts_platform_admin ON global_base_prompts
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Reuse set_updated_at() (defined in 005_system_prompts.sql)
CREATE TRIGGER global_base_prompts_updated_at
  BEFORE UPDATE ON global_base_prompts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Remove org-admin prompt authoring. Mission prompts (system_prompts) fully
-- replace this: org admins now only select a headline, never author raw text.
-- =============================================================================

DROP TABLE IF EXISTS prompt_versions CASCADE;
