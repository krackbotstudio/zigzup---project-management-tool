-- ============================================================
-- ZigZup CRM — Backfill crm_leads for orphaned board cards
-- Run ONCE in Supabase SQL Editor after running supabase_migration_crm.sql
-- Safe to re-run (INSERT ... WHERE NOT EXISTS)
-- ============================================================

-- Creates a crm_lead record for every card that lives in a CRM board
-- list but has no corresponding crm_lead row yet.
INSERT INTO crm_leads (id, workspace_id, card_id, created_at)
SELECT
  substring(gen_random_uuid()::text, 1, 8) AS id,
  b.workspace_id,
  c.id                                      AS card_id,
  COALESCE(c.created_at, NOW())             AS created_at
FROM cards c
JOIN lists  l ON c.list_id  = l.id
JOIN boards b ON l.board_id = b.id
WHERE
  -- target only CRM boards
  (b.board_type = 'crm' OR b.name = 'Sales CRM')
  -- skip cards that already have a crm_lead
  AND NOT EXISTS (
    SELECT 1 FROM crm_leads cl WHERE cl.card_id = c.id
  );

-- Show how many rows were inserted
SELECT COUNT(*) AS crm_leads_created FROM crm_leads;
