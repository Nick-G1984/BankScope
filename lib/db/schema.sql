-- ============================================================
-- BankScope Intelligence — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: intelligence_items
-- Core store for all ingested and AI-processed items
-- ============================================================
CREATE TABLE IF NOT EXISTS intelligence_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         TEXT NOT NULL UNIQUE,   -- deduplication key
  title             TEXT NOT NULL,
  source_name       TEXT NOT NULL,
  source_type       TEXT NOT NULL CHECK (
    source_type IN ('regulator', 'government', 'market', 'news', 'other')
  ),
  content_type      TEXT NOT NULL DEFAULT 'news' CHECK (
    content_type IN (
      'press-release', 'publication', 'consultation', 'speech',
      'policy-statement', 'enforcement', 'data', 'news', 'other'
    )
  ),
  publish_date      TIMESTAMPTZ,
  source_url        TEXT,
  raw_excerpt       TEXT,
  ai_summary        TEXT,
  affected_audience TEXT[]   DEFAULT '{}',
  priority_score    INTEGER  CHECK (priority_score BETWEEN 1 AND 10),
  urgency           TEXT     CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  category_tags     TEXT[]   DEFAULT '{}',
  suggested_next_step TEXT,
  confidence_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    confidence_status IN ('ai-generated', 'reviewed', 'pending')
  ),
  is_processed      BOOLEAN  NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_intelligence_source_name   ON intelligence_items(source_name);
CREATE INDEX IF NOT EXISTS idx_intelligence_urgency        ON intelligence_items(urgency);
CREATE INDEX IF NOT EXISTS idx_intelligence_publish_date   ON intelligence_items(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_is_processed   ON intelligence_items(is_processed);
CREATE INDEX IF NOT EXISTS idx_intelligence_content_type   ON intelligence_items(content_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_created_at     ON intelligence_items(created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_intelligence_fts ON intelligence_items
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(ai_summary, '') || ' ' || coalesce(raw_excerpt, '')));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_intelligence_items_updated_at
  BEFORE UPDATE ON intelligence_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: data_sources
-- Registry of all configured data sources
-- ============================================================
CREATE TABLE IF NOT EXISTS data_sources (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL UNIQUE,
  source_type      TEXT NOT NULL CHECK (
    source_type IN ('regulator', 'government', 'market', 'news', 'other')
  ),
  url              TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_fetched     TIMESTAMPTZ,
  fetch_frequency  TEXT NOT NULL DEFAULT 'daily',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: ingestion_runs
-- Audit log of every ingestion attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'running' CHECK (
    status IN ('running', 'completed', 'failed')
  ),
  items_fetched    INTEGER NOT NULL DEFAULT 0,
  items_new        INTEGER NOT NULL DEFAULT 0,
  items_processed  INTEGER NOT NULL DEFAULT 0,
  error_log        TEXT,
  source_results   JSONB
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started_at ON ingestion_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status     ON ingestion_runs(status);

-- ============================================================
-- Table: email_signups
-- Landing page email capture
-- ============================================================
CREATE TABLE IF NOT EXISTS email_signups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- Items are publicly readable; writes restricted to service role
-- ============================================================
ALTER TABLE intelligence_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_signups       ENABLE ROW LEVEL SECURITY;

-- Public read on intelligence_items
CREATE POLICY "Public can read intelligence_items"
  ON intelligence_items FOR SELECT
  USING (true);

-- Public read on data_sources
CREATE POLICY "Public can read data_sources"
  ON data_sources FOR SELECT
  USING (true);

-- Public read on ingestion_runs
CREATE POLICY "Public can read ingestion_runs"
  ON ingestion_runs FOR SELECT
  USING (true);

-- Service role can do everything (bypasses RLS with service_role key)
-- No additional policies needed — service_role key bypasses RLS

-- ============================================================
-- Seed: initial data sources
-- ============================================================
INSERT INTO data_sources (name, source_type, url, fetch_frequency) VALUES
  ('FCA News',           'regulator',  'https://www.fca.org.uk/news/rss.xml',                           'daily'),
  ('FCA Press Releases', 'regulator',  'https://www.fca.org.uk/news/press-releases/rss.xml',            'daily'),
  ('FCA Publications',   'regulator',  'https://www.fca.org.uk/publications/rss.xml',                   'daily'),
  ('FCA Speeches',       'regulator',  'https://www.fca.org.uk/news/speeches/rss.xml',                  'daily'),
  ('Bank of England',    'regulator',  'https://www.bankofengland.co.uk/rss/publications',              'daily'),
  ('PRA',                'regulator',  'https://www.bankofengland.co.uk/prudential-regulation/news-rss','daily'),
  ('ICO',                'regulator',  'https://ico.org.uk/feed/',                                      'daily'),
  ('HM Treasury',        'government', 'https://www.gov.uk/government/organisations/hm-treasury.atom',  'daily'),
  ('Companies House',    'government', 'https://api.company-information.service.gov.uk',                'daily')
ON CONFLICT (name) DO NOTHING;
