-- Migration 005: commentary enrichment columns
-- Run AFTER migration-004.sql
-- Adds two columns to regulatory_files for Phase 2 commentary tracking.

-- commentary_enriched_at: timestamp of the last commentary enrichment run.
-- Separate from enriched_at (Phase 1) so each phase can be tracked independently.
ALTER TABLE regulatory_files
  ADD COLUMN IF NOT EXISTS commentary_enriched_at timestamptz;

-- commentary_rejected_candidates: JSONB array of candidates that were evaluated
-- and rejected during commentary enrichment. Used for debugging relevance quality
-- and tuning the scoring engine. Not shown to users.
-- Each entry shape: { url, title, domain, rejection_stage, rejection_reason, score }
ALTER TABLE regulatory_files
  ADD COLUMN IF NOT EXISTS commentary_rejected_candidates jsonb NOT NULL DEFAULT '[]';

-- Index on commentary_enriched_at for scheduled re-enrichment queries
CREATE INDEX IF NOT EXISTS idx_regulatory_files_commentary_enriched_at
  ON regulatory_files(commentary_enriched_at DESC NULLS LAST);
