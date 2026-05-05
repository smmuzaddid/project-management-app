-- =====================================================
-- MIGRATION: iOS App Support
-- Run this in Supabase SQL Editor AFTER the original schema.sql
-- =====================================================

-- 1. Add updated_at columns for WatermelonDB sync watermark
ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE projects     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE follow_ups   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE reminders    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to each table
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tasks','projects','follow_ups','reminders','profiles','project_members']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
      CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', tbl, tbl);
  END LOOP;
END;
$$;

-- 3. Soft-delete tracking for WatermelonDB sync
CREATE TABLE IF NOT EXISTS _deleted_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  deleted_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. Push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  platform   TEXT DEFAULT 'ios',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push tokens" ON push_tokens;
CREATE POLICY "Users manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- 5. Enable pg_net extension (needed for DB → Edge Function calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 6. Notification trigger: task assigned
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only fire when assigned_to changes to a non-null value
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    PERFORM net.http_post(
      url     := 'https://smtbkiwfdbcuhxkmzkxy.supabase.co/functions/v1/notify-task-assigned',
      body    := json_build_object(
                   'task_id',     NEW.id,
                   'assigned_to', NEW.assigned_to,
                   'task_title',  NEW.title
                 )::text,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGJraXdmZGJjdWh4a216a3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjQzMTcsImV4cCI6MjA5MTg0MDMxN30.j9oL-6cyOk1Px7PODSSst5TOfjPRSawrJyhchcGgi9Q'
                 )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_assigned ON tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

-- 7. Notification trigger: task status changed
CREATE OR REPLACE FUNCTION notify_task_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url     := 'https://smtbkiwfdbcuhxkmzkxy.supabase.co/functions/v1/notify-task-status',
      body    := json_build_object(
                   'task_id',    NEW.id,
                   'task_title', NEW.title,
                   'new_status', NEW.status,
                   'project_id', NEW.project_id
                 )::text,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGJraXdmZGJjdWh4a216a3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjQzMTcsImV4cCI6MjA5MTg0MDMxN30.j9oL-6cyOk1Px7PODSSst5TOfjPRSawrJyhchcGgi9Q'
                 )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_status_changed ON tasks;
CREATE TRIGGER on_task_status_changed
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_status_changed();
