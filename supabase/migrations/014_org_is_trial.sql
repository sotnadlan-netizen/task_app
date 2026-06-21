-- =============================================================================
-- Free Trial Self-Signup — mark auto-provisioned personal orgs as trials
-- =============================================================================
-- A "free trial" user signs in with Google and is immediately given a personal
-- organization (as admin) with a fixed minute allowance. These trial orgs must
-- be kept out of the platform-admin "All organizations" table and surfaced in a
-- separate "Free trial users" panel instead — so they need a flag.
--
-- No RLS changes: trial orgs/memberships are created and listed via the FastAPI
-- backend using the service_role key, consistent with the rest of the app.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false;
