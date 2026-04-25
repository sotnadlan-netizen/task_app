-- Add calendar_event JSONB column to sessions table for lightweight Google Calendar integration
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS calendar_event JSONB DEFAULT NULL;
