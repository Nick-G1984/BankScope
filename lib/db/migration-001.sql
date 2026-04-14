-- =============================================================
-- Migration 001: Source health tracking + richer AI fields
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING
-- =============================================================

-- -------------------------------------------------------------
-- 1. Add source health columns to data_sources
-- -------------------------------------------------------------
ALTER TABLE data_sources
  ADD COLUMN IF NOT EXISTS last_attempted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_success_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error         TEXT,
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_items_fetched INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_items_new     INTEGER NOT NULL DEFAULT 0;

-- -------------------------------------------------------------
-- 2. Add richer AI summary columns to intelligence_items
-- -------------------------------------------------------------
ALTER TABLE intelligence_items
  ADD COLUMN IF NOT EXISTS action_required    TEXT CHECK (action_required IN ('yes', 'monitor', 'awareness')),
  ADD COLUMN IF NOT EXISTS regulatory_theme   TEXT CHECK (regulatory_theme IN (
    'conduct', 'prudential', 'consumer-duty', 'complaints',
    'governance', 'operational-resilience', 'aml-fraud',
    'data-privacy', 'market-competition', 'other'
  )),
  ADD COLUMN IF NOT EXISTS deadline           DATE,
  ADD COLUMN IF NOT EXISTS priority_rationale TEXT;

-- -------------------------------------------------------------
-- 3. Fix broken feed URLs in data_sources
--    (only updates rows where the broken URL is still in use)
-- -------------------------------------------------------------

-- FCA: switch fca.org.uk press-release / speeches RSS → GOV.UK atom
UPDATE data_sources
SET url = 'https://www.gov.uk/government/organisations/financial-conduct-authority.atom'
WHERE name IN ('FCA Press Releases', 'FCA Speeches')
  AND url LIKE '%fca.org.uk%rss%';

-- PRA: replace broken bankofengland.co.uk prudential RSS → GOV.UK atom
UPDATE data_sources
SET url = 'https://www.gov.uk/government/organisations/prudential-regulation-authority.atom'
WHERE name = 'PRA'
  AND url LIKE '%prudential-regulation/news-rss%';

-- ICO: replace non-working ico.org.uk/feed → blog RSS
UPDATE data_sources
SET url = 'https://ico.org.uk/about-the-ico/news-and-events/news-and-blogs/rss/'
WHERE name = 'ICO'
  AND url = 'https://ico.org.uk/feed/';

-- BoE: primary URL is still working; no change needed for existing row
-- (fallback handled in code)

-- -------------------------------------------------------------
-- 4. Ensure core source rows exist (idempotent seeding)
--    If the seed script has already run, these are no-ops.
-- -------------------------------------------------------------
INSERT INTO data_sources (name, source_type, url, is_active, fetch_frequency)
VALUES
  ('FCA',            'regulator',   'https://www.gov.uk/government/organisations/financial-conduct-authority.atom',         true, 'daily'),
  ('PRA',            'regulator',   'https://www.gov.uk/government/organisations/prudential-regulation-authority.atom',     true, 'daily'),
  ('Bank of England','regulator',   'https://www.bankofengland.co.uk/rss/publications',                                    true, 'daily'),
  ('ICO',            'regulator',   'https://ico.org.uk/about-the-ico/news-and-events/news-and-blogs/rss/',                true, 'daily'),
  ('HM Treasury',    'government',  'https://www.gov.uk/government/organisations/hm-treasury.atom',                        true, 'daily'),
  ('Companies House','government',  'https://www.gov.uk/government/organisations/companies-house.atom',                    true, 'daily')
ON CONFLICT (name) DO NOTHING;
