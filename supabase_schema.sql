-- ============================================================
-- Listen Agent — Supabase SQL Schema  (v3 — safe full sync)
--
-- HOW TO APPLY:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--
-- This script is fully idempotent: safe to run multiple times
-- on a fresh database OR an existing one with missing columns.
-- ============================================================


-- ── 1. sessions table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL    DEFAULT now(),
  filename    text        NOT NULL    DEFAULT '',
  summary     text        NOT NULL    DEFAULT '',
  audio_url   text                               -- nullable Storage URL
);

-- Add any columns that may be missing from an older table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='filename') THEN
    ALTER TABLE sessions ADD COLUMN filename text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='summary') THEN
    ALTER TABLE sessions ADD COLUMN summary text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='audio_url') THEN
    ALTER TABLE sessions ADD COLUMN audio_url text;
  END IF;
END $$;


-- ── 2. tasks table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL    DEFAULT now(),
  title       text        NOT NULL    DEFAULT '',
  description text        NOT NULL    DEFAULT '',
  assignee    text        NOT NULL    DEFAULT 'Advisor'
                          CHECK (assignee IN ('Advisor', 'Client')),
  priority    text        NOT NULL    DEFAULT 'Medium'
                          CHECK (priority IN ('High', 'Medium', 'Low')),
  completed   boolean     NOT NULL    DEFAULT false
);


-- ── 3. prompt_config table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_config (
  id             int         PRIMARY KEY DEFAULT 1,
  system_prompt  text        NOT NULL    DEFAULT '',
  updated_at     timestamptz NOT NULL    DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);


-- ── 4. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tasks_session_id_idx    ON tasks(session_id);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions(created_at DESC);


-- ── 5. Disable RLS (server uses service_role key) ────────────
ALTER TABLE sessions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_config DISABLE ROW LEVEL SECURITY;


-- ── 6. Schema cache reload ───────────────────────────────────
-- IMPORTANT: After adding columns to an existing table you MUST
-- reload the PostgREST schema cache, otherwise Supabase keeps
-- returning "column not found" even though the column exists.
--
--   Supabase Dashboard → Settings → API
--   → scroll to "Reload schema cache" → click the button
--
-- There is no SQL command for this — it must be done in the UI.


-- ============================================================
-- COLUMNS THIS APP USES — complete reference
-- ============================================================
--
-- sessions:    id, created_at, filename, summary, audio_url,
--              provider_id, client_email
-- tasks:       id, session_id, created_at, title, description,
--              assignee, priority, completed
-- prompt_config: id, system_prompt, updated_at
-- profiles:    id, email, role, created_at
-- ============================================================


-- ============================================================
-- v4 MIGRATION — Auth roles (run after v3 schema)
-- ============================================================

-- profiles table (one row per Supabase auth user)
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'provider' CHECK (role IN ('provider', 'client')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Add provider_id and client_email to sessions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='provider_id') THEN
    ALTER TABLE sessions ADD COLUMN provider_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sessions' AND column_name='client_email') THEN
    ALTER TABLE sessions ADD COLUMN client_email text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sessions_provider_id_idx  ON sessions(provider_id);
CREATE INDEX IF NOT EXISTS sessions_client_email_idx ON sessions(client_email);

-- Keep RLS disabled — backend enforces access via WHERE clauses
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- IMPORTANT: After running this migration, reload the PostgREST
-- schema cache: Supabase → Settings → API → Reload schema cache
