-- =============================================================
-- Migration 002: Richer AI summary fields (why_it_matters + affected_functions)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Safe to re-run: all statements use IF NOT EXISTS / idempotent patterns
-- =============================================================

-- -------------------------------------------------------------
-- 1. Add why_it_matters — 1-2 sentence practical implication
--    Distinct from ai_summary: focuses on what a firm risks or
--    must do, without repeating the factual description.
-- -------------------------------------------------------------
ALTER TABLE intelligence_items
  ADD COLUMN IF NOT EXISTS why_it_matters TEXT;

-- -------------------------------------------------------------
-- 2. Add affected_functions — internal teams that need to act
--    Values: compliance, risk, legal, operations, technology,
--            change-management, PMO, treasury, finance, HR, board
--    Populated by the AI summarisation pipeline.
-- -------------------------------------------------------------
ALTER TABLE intelligence_items
  ADD COLUMN IF NOT EXISTS affected_functions TEXT[] DEFAULT '{}';

-- -------------------------------------------------------------
-- 3. Index on affected_functions for dashboard filtering
--    (GIN index supports array containment queries)
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_intelligence_affected_functions
  ON intelligence_items USING GIN (affected_functions);

-- -------------------------------------------------------------
-- Notes:
--
-- After running this migration, re-run AI summarisation to
-- populate the new fields for existing records:
--
--   npm run reprocess -- --missing
--     → fills in records that have no summary yet
--
--   npm run reprocess -- --all
--     → refreshes every record with the improved prompt
--       (recommended after this migration to backfill both
--        new fields across all 240 existing items)
--
-- Estimated cost for full reprocess of 240 items:
--   gpt-4o-mini @ April 2026 pricing ≈ £0.25–0.40
--
-- A Vercel redeploy is sufficient to deploy the prompt
-- changes; the migration SQL only needs to run once in Supabase.
-- =============================================================
