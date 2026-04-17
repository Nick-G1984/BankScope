-- Migration 004: regulatory_files
-- Run this in Supabase SQL editor AFTER migration-003.sql
-- Adds the regulatory file layer — the structured source-of-truth object
-- that sits between raw ingestion and premium output generation.

-- ============================================================
-- REGULATORY FILES
-- One-to-one with intelligence_items (optional enrichment layer)
-- ============================================================

CREATE TABLE IF NOT EXISTS regulatory_files (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intelligence_item_id      uuid NOT NULL REFERENCES intelligence_items(id) ON DELETE CASCADE,

  -- ── 1. Source details (mirrored from item for query convenience) ──
  source_title              text NOT NULL,
  source_url                text,
  source_organisation       text NOT NULL,
  publication_date          date,
  regulatory_theme          text,
  urgency                   text,
  action_required           text,

  -- ── 2. Source-grounded summary ──
  source_summary            jsonb NOT NULL DEFAULT '{}',

  -- ── 3. Key operative points ──
  operative_points          jsonb NOT NULL DEFAULT '[]',

  -- ── 4. Action triggers ──
  action_triggers           jsonb NOT NULL DEFAULT '[]',

  -- ── 5. Areas of ambiguity ──
  ambiguity_areas           jsonb NOT NULL DEFAULT '[]',

  -- ── 6. External commentary ──
  external_commentary       jsonb NOT NULL DEFAULT '[]',
  commentary_status         text NOT NULL DEFAULT 'not_searched'
                              CHECK (commentary_status IN (
                                'not_searched', 'search_ready', 'partial', 'complete'
                              )),
  commentary_search_queries text[] NOT NULL DEFAULT '{}',

  -- ── 7. Synthesis ──
  synthesis                 jsonb NOT NULL DEFAULT '{}',

  -- ── 8. Ownership / governance ──
  ownership                 jsonb NOT NULL DEFAULT '{}',

  -- ── 9. Likely artefacts ──
  likely_artefacts          jsonb NOT NULL DEFAULT '[]',

  -- ── 10. BankScope operational view ──
  bankscope_view            jsonb NOT NULL DEFAULT '{}',

  -- ── Enrichment metadata ──
  enrichment_status         text NOT NULL DEFAULT 'pending'
                              CHECK (enrichment_status IN (
                                'pending', 'in_progress', 'completed', 'failed'
                              )),
  enrichment_model          text,
  enriched_at               timestamptz,
  enrichment_error          text,

  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),

  -- Enforce one file per intelligence item
  CONSTRAINT regulatory_files_item_unique UNIQUE (intelligence_item_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_regulatory_files_item_id
  ON regulatory_files(intelligence_item_id);

CREATE INDEX IF NOT EXISTS idx_regulatory_files_status
  ON regulatory_files(enrichment_status);

CREATE INDEX IF NOT EXISTS idx_regulatory_files_enriched_at
  ON regulatory_files(enriched_at DESC NULLS LAST);

-- ── Auto-update updated_at ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_regulatory_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER regulatory_files_updated_at
  BEFORE UPDATE ON regulatory_files
  FOR EACH ROW
  EXECUTE FUNCTION update_regulatory_files_updated_at();

-- ── RLS (Row Level Security) ───────────────────────────────────────────────

ALTER TABLE regulatory_files ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read any regulatory file (read-only product feature)
CREATE POLICY "Authenticated users can read regulatory files"
  ON regulatory_files FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update (enrichment runs server-side only)
CREATE POLICY "Service role can manage regulatory files"
  ON regulatory_files FOR ALL
  USING (auth.role() = 'service_role');
