-- Production migration 20260315013951_create_luminors_table on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Luminor Sanctum — AI Agent Specifications
-- Each Luminor is a portable AI intelligence entity that can be forged, published, and used across platforms.

CREATE TABLE IF NOT EXISTS luminors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE,
  
  -- Origin & Creator
  origin TEXT NOT NULL DEFAULT 'forged' CHECK (origin IN ('chosen', 'named', 'forged')),
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Domain & Voice
  domain TEXT NOT NULL DEFAULT 'custom',
  voice TEXT NOT NULL DEFAULT 'direct',
  personality TEXT[] NOT NULL DEFAULT '{}',
  element TEXT NOT NULL DEFAULT 'Spirit' CHECK (element IN ('Fire', 'Water', 'Earth', 'Wind', 'Void', 'Spirit')),
  wisdom TEXT,
  
  -- The Core — System Prompt
  system_prompt TEXT NOT NULL,
  
  -- Agent Capabilities (v2)
  preferred_model TEXT DEFAULT 'arcanea-auto',
  temperature REAL DEFAULT 0.7,
  knowledge TEXT[] DEFAULT '{}',
  starters TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  gate_alignment INTEGER[] DEFAULT '{}',
  
  -- Visual
  avatar TEXT DEFAULT '◈',
  color TEXT DEFAULT '#00bcd4',
  gradient TEXT DEFAULT '',
  
  -- Companion bond
  companion_id UUID,
  
  -- Marketplace
  published BOOLEAN NOT NULL DEFAULT false,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'creator', 'premium')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  rating REAL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  
  -- Export formats supported
  export_formats TEXT[] DEFAULT '{arcanea}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_luminors_creator ON luminors(creator_id);
CREATE INDEX IF NOT EXISTS idx_luminors_published ON luminors(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_luminors_domain ON luminors(domain);
CREATE INDEX IF NOT EXISTS idx_luminors_element ON luminors(element);
CREATE INDEX IF NOT EXISTS idx_luminors_slug ON luminors(slug);
CREATE INDEX IF NOT EXISTS idx_luminors_tags ON luminors USING gin(tags);

-- RLS
ALTER TABLE luminors ENABLE ROW LEVEL SECURITY;

-- Anyone can read published luminors
CREATE POLICY "Published luminors are viewable by everyone"
  ON luminors FOR SELECT
  USING (published = true);

-- Creators can read their own (published or not)
CREATE POLICY "Creators can view own luminors"
  ON luminors FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators can insert their own
CREATE POLICY "Creators can forge luminors"
  ON luminors FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own
CREATE POLICY "Creators can update own luminors"
  ON luminors FOR UPDATE
  USING (auth.uid() = creator_id);

-- Creators can delete their own
CREATE POLICY "Creators can delete own luminors"
  ON luminors FOR DELETE
  USING (auth.uid() = creator_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_luminors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER luminors_updated_at
  BEFORE UPDATE ON luminors
  FOR EACH ROW
  EXECUTE FUNCTION update_luminors_updated_at();

-- Auto-generate slug from name
CREATE OR REPLACE FUNCTION generate_luminor_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER luminors_slug_gen
  BEFORE INSERT ON luminors
  FOR EACH ROW
  EXECUTE FUNCTION generate_luminor_slug();
