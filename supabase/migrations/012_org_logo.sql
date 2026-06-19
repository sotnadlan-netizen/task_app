-- =============================================================================
-- Organization logo: logo_url column + public "org-logos" storage bucket
-- =============================================================================
-- Orgs can upload a custom logo shown in the dashboard header. The backend
-- uploads the file with the service_role key (which bypasses storage RLS); the
-- write policies below are defense-in-depth for any direct client access, while
-- the public read policy lets the <img> render the logo anywhere.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Public bucket (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone may read org logos (public bucket).
DROP POLICY IF EXISTS org_logos_public_read ON storage.objects;
CREATE POLICY org_logos_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'org-logos');

-- Writes restricted to platform admins or the org's own admins. Objects are
-- stored under "<org_id>/..." so the first path segment identifies the org.
DROP POLICY IF EXISTS org_logos_admin_insert ON storage.objects;
CREATE POLICY org_logos_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (
      is_platform_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT org_id::text FROM org_memberships
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS org_logos_admin_update ON storage.objects;
CREATE POLICY org_logos_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (
      is_platform_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT org_id::text FROM org_memberships
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS org_logos_admin_delete ON storage.objects;
CREATE POLICY org_logos_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (
      is_platform_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT org_id::text FROM org_memberships
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );
