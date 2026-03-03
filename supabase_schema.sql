-- ============================================================
-- ZigZup Complete Database Schema
-- Run this in the Supabase SQL Editor for a FRESH installation.
-- If you already have tables, run supabase_migration.sql instead.
-- ============================================================

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Boards
CREATE TABLE IF NOT EXISTS boards (
  id           text PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  color        text,
  created_by   text,
  created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Lists
CREATE TABLE IF NOT EXISTS lists (
  id         text PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  board_id   text NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name       text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Cards (complete schema with all app fields)
CREATE TABLE IF NOT EXISTS cards (
  id                text    PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  list_id           text    NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title             text    NOT NULL,
  description       text,
  priority          text    NOT NULL DEFAULT 'medium',
  status            text    NOT NULL DEFAULT 'todo',
  created_by        text,
  assignees         text[]  NOT NULL DEFAULT '{}',
  labels            jsonb   NOT NULL DEFAULT '[]',
  due_date          text,
  start_date        text,
  estimated_time    integer,
  checklist_items   jsonb   NOT NULL DEFAULT '[]',
  links             jsonb   NOT NULL DEFAULT '[]',
  comments          jsonb   NOT NULL DEFAULT '[]',
  comments_count    integer NOT NULL DEFAULT 0,
  attachments_count integer NOT NULL DEFAULT 0,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Members
CREATE TABLE IF NOT EXISTS members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  email        text NOT NULL,
  name         text NOT NULL,
  role         text NOT NULL DEFAULT 'member',
  avatar       text,
  created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (workspace_id, user_id)
);

-- 6. Invites
CREATE TABLE IF NOT EXISTS invites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_name text NOT NULL,
  invited_by     text NOT NULL,
  invited_email  text NOT NULL,
  role           text NOT NULL DEFAULT 'member',
  status         text NOT NULL DEFAULT 'pending',
  created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  message    text NOT NULL,
  type       text NOT NULL,
  is_read    boolean NOT NULL DEFAULT false,
  link       text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Pipeline Stages (visual workflow, NOT automation triggers)
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          text    PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  board_id    text    NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name        text    NOT NULL,
  description text,
  color       text    NOT NULL DEFAULT '#6366f1',
  list_ids    text[]  NOT NULL DEFAULT '{}',
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Recordings (Demo Recorder)
CREATE TABLE IF NOT EXISTS recordings (
  id            text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  duration      numeric NOT NULL,
  size          numeric NOT NULL,
  mime_type     text NOT NULL,
  storage_path  text NOT NULL,
  download_url  text NOT NULL,
  thumbnail     text,
  tags          text[] DEFAULT '{}',
  created_at    timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE workspaces     ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings     ENABLE ROW LEVEL SECURITY;

-- Open policies for authenticated users (WITH CHECK allows inserts)
CREATE POLICY "Allow all for authenticated" ON workspaces      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON boards          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON lists           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON cards           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON members         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON invites         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON notifications   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON pipeline_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON recordings      FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Realtime ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE
  workspaces, boards, lists, cards, members, invites,
  notifications, pipeline_stages, recordings;

-- ── Storage (Demo Recorder) ───────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('recordings', 'recordings', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recordings');
CREATE POLICY "Allow public viewing" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'recordings');
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'recordings');
