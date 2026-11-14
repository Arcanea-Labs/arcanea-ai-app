-- Production migration 20260227141633_create_media_catalog_v2 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Media Catalog — intelligent metadata for all gallery assets
-- Guardian: Lyria (Sight Gate, 639 Hz) — Intuition, vision

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE media_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT UNIQUE NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'arcanea-gallery',
  filename TEXT NOT NULL,
  guardian TEXT,
  gate TEXT,
  element TEXT,
  frequency_hz INTEGER,
  godbeast TEXT,
  source TEXT DEFAULT 'manual',
  scene TEXT,
  tags TEXT[] DEFAULT '{}',
  media_type TEXT DEFAULT 'image',
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  quality_tier INTEGER CHECK (quality_tier BETWEEN 1 AND 4),
  taste_score JSONB DEFAULT '{}',
  status TEXT DEFAULT 'review' CHECK (status IN ('review', 'approved', 'archived', 'rejected')),
  analyzed_by TEXT DEFAULT 'filename',
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE media_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media catalog public read"
  ON media_catalog FOR SELECT TO public USING (true);

CREATE POLICY "Media catalog service write"
  ON media_catalog FOR ALL TO service_role USING (true);

CREATE INDEX idx_media_catalog_guardian ON media_catalog(guardian);
CREATE INDEX idx_media_catalog_tier ON media_catalog(quality_tier);
CREATE INDEX idx_media_catalog_status ON media_catalog(status);
CREATE INDEX idx_media_catalog_tags ON media_catalog USING GIN(tags);
CREATE INDEX idx_media_catalog_source ON media_catalog(source);

CREATE TRIGGER media_catalog_updated_at
  BEFORE UPDATE ON media_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
