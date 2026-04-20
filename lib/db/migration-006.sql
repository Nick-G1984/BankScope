-- Migration 006: Firm classifications + compliance tasks
-- Run AFTER migration-005.sql
-- Creates two new tables:
--   firm_classifications  — canonical classification records for regulated firm types
--   compliance_tasks      — user-specific task tracking per classification
--
-- No schema changes to existing tables.

-- ============================================================
-- FIRM CLASSIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS firm_classifications (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text        NOT NULL UNIQUE,
  name              text        NOT NULL,
  description       text        NOT NULL DEFAULT '',

  -- What the firm does (e.g. "investment advice", "consumer credit")
  services          text[]      NOT NULL DEFAULT '{}',

  -- Regulatory bodies relevant to this classification
  -- Values should match source_name values in intelligence_items
  -- e.g. 'FCA', 'ICO', 'FOS', 'ASA', 'TPR', 'FSCS', 'Gambling Commission'
  regulators        text[]      NOT NULL DEFAULT '{}',

  -- High-level legislative/regulatory frameworks applicable
  -- e.g. 'Consumer Duty', 'SMCR', 'MLR 2017', 'PSD2', 'GDPR'
  obligations       text[]      NOT NULL DEFAULT '{}',

  -- AI-generated narrative scope summary (cached, generated on demand)
  -- Schema: {
  --   high_level_overview: string,
  --   key_regulations: string[],
  --   key_regulators: string[],
  --   compliance_tasks: string[],
  --   suggested_deliverables: string[]
  -- }
  scope_summary     jsonb,
  scope_enriched_at timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_firm_classifications_slug
  ON firm_classifications(slug);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_firm_classifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER firm_classifications_updated_at
  BEFORE UPDATE ON firm_classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_firm_classifications_updated_at();

-- RLS
ALTER TABLE firm_classifications ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read classifications
CREATE POLICY "Authenticated users can read firm classifications"
  ON firm_classifications FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can read (for public scope pages if unauthenticated)
CREATE POLICY "Public can read firm classifications"
  ON firm_classifications FOR SELECT
  TO anon
  USING (true);

-- Only service role can insert/update (migrations + AI enrichment)
CREATE POLICY "Service role can manage firm classifications"
  ON firm_classifications FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- COMPLIANCE TASKS
-- ============================================================

CREATE TABLE IF NOT EXISTS compliance_tasks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classification_id   uuid        NOT NULL REFERENCES firm_classifications(id) ON DELETE CASCADE,
  task                text        NOT NULL,
  status              text        NOT NULL DEFAULT 'todo'
                        CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date            date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_user_id
  ON compliance_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_compliance_tasks_classification_id
  ON compliance_tasks(classification_id);

CREATE INDEX IF NOT EXISTS idx_compliance_tasks_user_classification
  ON compliance_tasks(user_id, classification_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_compliance_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compliance_tasks_updated_at
  BEFORE UPDATE ON compliance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_tasks_updated_at();

-- RLS
ALTER TABLE compliance_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own tasks
CREATE POLICY "Users can manage their own compliance tasks"
  ON compliance_tasks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read all (for admin)
CREATE POLICY "Service role can read all compliance tasks"
  ON compliance_tasks FOR SELECT
  USING (auth.role() = 'service_role');
