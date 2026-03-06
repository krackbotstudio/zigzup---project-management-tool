-- ============================================================
-- ZigZup CRM Module — Supabase Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add board_type to boards table
ALTER TABLE boards ADD COLUMN IF NOT EXISTS board_type TEXT NOT NULL DEFAULT 'project';

-- 2. CRM Contacts (contact/company directory)
CREATE TABLE IF NOT EXISTS crm_contacts (
  id           TEXT PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  company      TEXT,
  website      TEXT,
  notes        TEXT,
  tags         JSONB DEFAULT '[]',
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRM Leads — thin metadata layer on top of existing Cards
CREATE TABLE IF NOT EXISTS crm_leads (
  id           TEXT PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  card_id      TEXT NOT NULL UNIQUE REFERENCES cards(id) ON DELETE CASCADE,
  contact_id   TEXT REFERENCES crm_contacts(id) ON DELETE SET NULL,
  deal_value   NUMERIC,
  currency     TEXT DEFAULT 'USD',
  source       TEXT,
  owner_id     UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CRM Activities — unified timeline aggregating all events for a lead
CREATE TABLE IF NOT EXISTS crm_activities (
  id           TEXT PRIMARY KEY DEFAULT substring(gen_random_uuid()::text, 1, 8),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id      TEXT REFERENCES crm_leads(id) ON DELETE CASCADE,
  contact_id   TEXT REFERENCES crm_contacts(id) ON DELETE SET NULL,
  type         TEXT NOT NULL,
  -- 'note' | 'call' | 'email' | 'meeting' | 'task' | 'stage_change' | 'campaign'
  description  TEXT,
  metadata     JSONB DEFAULT '{}',
  -- For meeting: { card_id, date, duration }
  -- For task:    { card_id, title }
  -- For stage:   { from_stage, to_stage }
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_contacts_workspace ON crm_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_workspace ON crm_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_card ON crm_leads(card_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_workspace ON crm_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_boards_type ON boards(board_type);

-- 6. RLS Policies (enable RLS on new tables)
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

-- Allow users to access CRM data for workspaces they belong to
CREATE POLICY "crm_contacts_workspace_member" ON crm_contacts
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "crm_leads_workspace_member" ON crm_leads
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "crm_activities_workspace_member" ON crm_activities
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM members WHERE user_id = auth.uid()
    )
  );
