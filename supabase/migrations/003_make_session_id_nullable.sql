-- Allow tasks to be created manually without a session (e.g., from the task management UI)
ALTER TABLE tasks ALTER COLUMN session_id DROP NOT NULL;
