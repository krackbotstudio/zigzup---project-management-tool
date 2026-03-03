-- ============================================================
-- ZigZup Complete Fix Migration v2
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ── 1. CARDS: Add all columns the app needs ───────────────
ALTER TABLE cards ADD COLUMN IF NOT EXISTS status            text    NOT NULL DEFAULT 'todo';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS created_by        text;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS labels            jsonb   NOT NULL DEFAULT '[]';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS assignees         text[]  NOT NULL DEFAULT '{}';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS start_date        text;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS estimated_time    integer;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS checklist_items   jsonb   NOT NULL DEFAULT '[]';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS links             jsonb   NOT NULL DEFAULT '[]';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS comments          jsonb   NOT NULL DEFAULT '[]';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS comments_count    integer NOT NULL DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS attachments_count integer NOT NULL DEFAULT 0;

-- ── 2. PIPELINE STAGES: Drop & recreate with correct schema ─
-- (The original table had action_type NOT NULL with no default, and
--  was missing color + list_ids. Easier to drop and recreate.)
DROP TABLE IF EXISTS pipeline_stages CASCADE;

CREATE TABLE pipeline_stages (
  id          text    PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  board_id    text    NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name        text    NOT NULL,
  description text,
  color       text    NOT NULL DEFAULT '#6366f1',
  list_ids    text[]  NOT NULL DEFAULT '{}',
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Re-enable RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Drop old policy if it exists, then recreate
DROP POLICY IF EXISTS "Allow all operations for authenticated users on pipeline_stages" ON pipeline_stages;
CREATE POLICY "Allow all operations for authenticated users on pipeline_stages"
  ON pipeline_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Re-add to realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_stages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. BOARDS: Add created_by if not present ──────────────
ALTER TABLE boards ADD COLUMN IF NOT EXISTS created_by text;

-- ── 4. Fix cards RLS policy to include WITH CHECK ─────────
DROP POLICY IF EXISTS "Allow all operations for authenticated users on cards" ON cards;
CREATE POLICY "Allow all operations for authenticated users on cards"
  ON cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 5. Fix other table RLS policies to include WITH CHECK ──
DROP POLICY IF EXISTS "Allow all operations for authenticated users on boards" ON boards;
CREATE POLICY "Allow all operations for authenticated users on boards"
  ON boards FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for authenticated users on lists" ON lists;
CREATE POLICY "Allow all operations for authenticated users on lists"
  ON lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for authenticated users on members" ON members;
CREATE POLICY "Allow all operations for authenticated users on members"
  ON members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for authenticated users on workspaces" ON workspaces;
CREATE POLICY "Allow all operations for authenticated users on workspaces"
  ON workspaces FOR ALL TO authenticated USING (true) WITH CHECK (true);
