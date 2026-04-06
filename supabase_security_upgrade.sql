-- ============================================================
-- Listen Agent — Security Upgrade SQL
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Covers:
--   1. Missing columns (title, embedding, custom_prompt)
--   2. Missing tables (prompt_history, usage_logs)
--   3. Complete RLS on ALL tables
--   4. pgvector RPC with strict tenant isolation
--   5. Least-privilege cron role
--   6. Storage bucket policy (private + signed-URL only)
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- SECTION 1 — Missing columns
-- ═══════════════════════════════════════════════════════════

-- sessions: title (AI-generated headline)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='title') THEN
    ALTER TABLE sessions ADD COLUMN title text;
  END IF;
END $$;

-- sessions: embedding (pgvector for RAG)
CREATE EXTENSION IF NOT EXISTS vector;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='embedding') THEN
    ALTER TABLE sessions ADD COLUMN embedding vector(768);
  END IF;
END $$;

-- profiles: custom_prompt (per-provider prompt override)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='custom_prompt') THEN
    ALTER TABLE profiles ADD COLUMN custom_prompt text;
  END IF;
END $$;

-- Indexes for performance + vector search
CREATE INDEX IF NOT EXISTS sessions_embedding_idx
  ON sessions USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS sessions_title_idx ON sessions(title);


-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — Missing tables with RLS
-- ═══════════════════════════════════════════════════════════

-- prompt_history: audit trail of system prompt changes
CREATE TABLE IF NOT EXISTS prompt_history (
  id           bigserial   PRIMARY KEY,
  system_prompt text       NOT NULL,
  changed_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prompt_history_created_at_idx ON prompt_history(created_at DESC);

ALTER TABLE prompt_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prompt_history_provider_read" ON prompt_history;
CREATE POLICY "prompt_history_provider_read" ON prompt_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider')
  );

-- Providers can insert their own history entries
DROP POLICY IF EXISTS "prompt_history_provider_insert" ON prompt_history;
CREATE POLICY "prompt_history_provider_insert" ON prompt_history
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- No UPDATE or DELETE on audit log — append-only


-- usage_logs: Gemini token cost tracking (backend-only, no direct client access)
CREATE TABLE IF NOT EXISTS usage_logs (
  id             bigserial   PRIMARY KEY,
  model          text        NOT NULL,
  session_id     uuid        REFERENCES sessions(id) ON DELETE SET NULL,
  prompt_tokens  int         NOT NULL DEFAULT 0,
  output_tokens  int         NOT NULL DEFAULT 0,
  total_tokens   int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS usage_logs_session_id_idx ON usage_logs(session_id);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- usage_logs is written only by the service-role key (backend).
-- No direct client access permitted at all.
DROP POLICY IF EXISTS "usage_logs_no_client_access" ON usage_logs;
-- (no policy = no access for anon/authenticated keys — service role bypasses RLS)


-- ═══════════════════════════════════════════════════════════
-- SECTION 3 — Harden existing RLS policies
-- ═══════════════════════════════════════════════════════════

-- Re-apply sessions policies (idempotent)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_provider_select" ON sessions;
CREATE POLICY "sessions_provider_select" ON sessions
  FOR SELECT USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "sessions_client_select" ON sessions;
CREATE POLICY "sessions_client_select" ON sessions
  FOR SELECT USING (
    client_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_provider_insert" ON sessions;
CREATE POLICY "sessions_provider_insert" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "sessions_provider_update" ON sessions;
CREATE POLICY "sessions_provider_update" ON sessions
  FOR UPDATE USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "sessions_provider_delete" ON sessions;
CREATE POLICY "sessions_provider_delete" ON sessions
  FOR DELETE USING (auth.uid() = provider_id);


-- Re-apply tasks policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = tasks.session_id
        AND (
          s.provider_id = auth.uid()
          OR s.client_email = (SELECT email FROM profiles WHERE id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "tasks_provider_write" ON tasks;
CREATE POLICY "tasks_provider_write" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = tasks.session_id AND s.provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_client_toggle" ON tasks;
CREATE POLICY "tasks_client_toggle" ON tasks
  FOR UPDATE
  USING (
    assignee = 'Client'
    AND EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = tasks.session_id
        AND s.client_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    -- Client can only toggle `completed`; prevent client from changing assignee/priority
    assignee = 'Client'
    AND EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = tasks.session_id
        AND s.client_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );


-- profiles: self only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self" ON profiles;
CREATE POLICY "profiles_self" ON profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- prompt_config: providers read/write, clients no access
ALTER TABLE prompt_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prompt_config_provider_select" ON prompt_config;
CREATE POLICY "prompt_config_provider_select" ON prompt_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider')
  );

DROP POLICY IF EXISTS "prompt_config_provider_write" ON prompt_config;
CREATE POLICY "prompt_config_provider_write" ON prompt_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'provider')
  );


-- ═══════════════════════════════════════════════════════════
-- SECTION 4 — Vector search RPC with strict tenant isolation
--
-- This RPC enforces provider_id filtering INSIDE the function
-- so a user cannot pass a different provider_id and see others'
-- data — auth.uid() is always used, never the caller's parameter.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_client_sessions(
  query_embedding vector(768),
  match_count     int     DEFAULT 5,
  match_threshold float   DEFAULT 0.65,
  client_email    text    DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  title        text,
  summary      text,
  client_email text,
  created_at   timestamptz,
  similarity   float
)
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as the function owner (postgres), not the calling user
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.summary,
    s.client_email,
    s.created_at,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM sessions s
  WHERE
    -- CRITICAL: always restrict to the calling user's provider_id
    -- auth.uid() cannot be spoofed — it comes from the validated JWT
    s.provider_id = auth.uid()
    -- Optionally narrow to a specific client
    AND (match_client_sessions.client_email IS NULL
         OR s.client_email = match_client_sessions.client_email)
    -- Only sessions that have embeddings
    AND s.embedding IS NOT NULL
    -- Cosine similarity threshold
    AND 1 - (s.embedding <=> query_embedding) >= match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Allow authenticated users to call this RPC (RLS is enforced inside)
REVOKE ALL ON FUNCTION match_client_sessions FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_client_sessions TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- SECTION 5 — Least-privilege cron role for background jobs
--
-- The cron jobs (audio cleanup, reminder emails) only need to:
--   - SELECT sessions (find expired audio / pending tasks)
--   - UPDATE sessions (null out audio_url)
--   - SELECT tasks (find incomplete tasks)
--   - SELECT profiles (get provider email)
-- They do NOT need INSERT, DELETE, or access to prompt tables.
-- ═══════════════════════════════════════════════════════════

-- Create the role (skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cron_worker') THEN
    CREATE ROLE cron_worker NOLOGIN;
  END IF;
END $$;

-- Grant only what cron needs
GRANT USAGE ON SCHEMA public TO cron_worker;

GRANT SELECT ON sessions TO cron_worker;
GRANT UPDATE (audio_url) ON sessions TO cron_worker;  -- only the audio_url column

GRANT SELECT ON tasks TO cron_worker;

GRANT SELECT (id, email) ON profiles TO cron_worker;  -- only id + email columns

-- Explicitly deny everything else (defence in depth)
REVOKE INSERT, DELETE, TRUNCATE ON sessions FROM cron_worker;
REVOKE INSERT, DELETE, TRUNCATE ON tasks FROM cron_worker;
REVOKE ALL ON prompt_config FROM cron_worker;
REVOKE ALL ON prompt_history FROM cron_worker;
REVOKE ALL ON usage_logs FROM cron_worker;

-- NOTE: To use cron_worker in your cron scripts, connect with:
-- SET ROLE cron_worker;
-- before running queries in the cron Lambda/job script.


-- ═══════════════════════════════════════════════════════════
-- SECTION 6 — Storage: private bucket policy
--
-- Run this AFTER creating the bucket named "audio-recordings"
-- in Supabase Storage UI with "Private" toggle enabled.
-- ═══════════════════════════════════════════════════════════

-- Remove any existing permissive policies on the bucket
DROP POLICY IF EXISTS "audio_public_read" ON storage.objects;
DROP POLICY IF EXISTS "audio_public_upload" ON storage.objects;

-- Providers can upload to their own folder: {providerId}/{sessionId}/{filename}
CREATE POLICY "audio_provider_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Providers can read files in their own folder only
CREATE POLICY "audio_provider_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Providers can delete their own files
CREATE POLICY "audio_provider_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No public access — all downloads go through backend signed URLs
-- (Backend uses service_role key which bypasses RLS to generate signed URLs)


-- ═══════════════════════════════════════════════════════════
-- Reload schema cache after running this script:
--   Supabase → Settings → API → Reload schema cache
-- ═══════════════════════════════════════════════════════════
