-- Production migration 20260404125547_arcanea_claw_tables on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- =====================================================================
-- ARCANEA CLAW — CREATOR OS DATABASE FOUNDATION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- TABLE 1: asset_metadata
CREATE TABLE IF NOT EXISTS public.asset_metadata (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name         text        NOT NULL,
  file_path         text,
  file_hash         text,
  file_size         bigint,
  mime_type         text,
  width             integer,
  height            integer,
  duration_seconds  numeric,
  guardian          text,
  element           text        CHECK (element IN ('Fire', 'Water', 'Earth', 'Wind', 'Void')),
  gate              text        CHECK (gate IN (
                                  'Foundation', 'Flow', 'Fire', 'Heart', 'Voice',
                                  'Sight', 'Crown', 'Starweave', 'Unity', 'Source'
                                )),
  content_type      text        CHECK (content_type IN (
                                  'hero', 'gallery', 'thumbnail', 'social',
                                  'video', 'audio', 'raw'
                                )),
  tags              text[]      DEFAULT '{}',
  quality_score     numeric(5,2) DEFAULT 0   CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_tier      text        DEFAULT 'unscored'
                                CHECK (quality_tier IN ('hero', 'gallery', 'thumbnail', 'reject', 'unscored')),
  status            text        DEFAULT 'new'
                                CHECK (status IN (
                                  'new', 'classified', 'processed', 'scored',
                                  'approved', 'rejected', 'published'
                                )),
  source_agent      text,
  storage_url       text,
  thumbnail_url     text,
  storage_tier      text        CHECK (storage_tier IS NULL OR storage_tier IN (
                                  'vercel_blob', 'supabase', 'r2', 'local'
                                )),
  world_id          text        DEFAULT 'arcanea',
  published_to      text[]      DEFAULT '{}',
  metadata          jsonb       DEFAULT '{}',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  approved_at       timestamptz,
  approved_by       text
);

CREATE TRIGGER asset_metadata_updated_at
  BEFORE UPDATE ON public.asset_metadata
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TABLE 2: agent_registry
CREATE TABLE IF NOT EXISTS public.agent_registry (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          text        UNIQUE NOT NULL,
  agent_type        text        NOT NULL
                                CHECK (agent_type IN (
                                  'arcanea-claw', 'claude-code', 'mobile-capture',
                                  'cloud-gemini', 'cloud-suno'
                                )),
  agent_name        text,
  hostname          text,
  ip_address        text,
  capabilities      text[]      DEFAULT '{}',
  status            text        DEFAULT 'offline'
                                CHECK (status IN ('online', 'busy', 'idle', 'offline', 'error')),
  current_task      text,
  items_processed   integer     DEFAULT 0   CHECK (items_processed >= 0),
  items_today       integer     DEFAULT 0   CHECK (items_today >= 0),
  last_heartbeat    timestamptz DEFAULT now(),
  last_error        text,
  config            jsonb       DEFAULT '{}',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TRIGGER agent_registry_updated_at
  BEFORE UPDATE ON public.agent_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TABLE 3: social_queue
CREATE TABLE IF NOT EXISTS public.social_queue (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          text        NOT NULL
                                CHECK (platform IN (
                                  'instagram', 'linkedin', 'x', 'youtube', 'tiktok'
                                )),
  account_id        text,
  content_text      text,
  media_ids         uuid[]      DEFAULT '{}',
  media_urls        text[]      DEFAULT '{}',
  hashtags          text[]      DEFAULT '{}',
  scheduled_at      timestamptz,
  published_at      timestamptz,
  published_url     text,
  status            text        DEFAULT 'draft'
                                CHECK (status IN (
                                  'draft', 'ready', 'approved', 'scheduled',
                                  'publishing', 'published', 'failed'
                                )),
  approved_by       text,
  approved_at       timestamptz,
  engagement        jsonb       DEFAULT '{}',
  error_message     text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TRIGGER social_queue_updated_at
  BEFORE UPDATE ON public.social_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TABLE 4: publish_pipeline
CREATE TABLE IF NOT EXISTS public.publish_pipeline (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target            text        NOT NULL
                                CHECK (target IN (
                                  'website', 'social', 'nft', 'book', 'music_platform'
                                )),
  asset_ids         uuid[]      DEFAULT '{}',
  action            text        NOT NULL
                                CHECK (action IN (
                                  'deploy_hero', 'deploy_gallery', 'update_og_image',
                                  'mint_nft', 'publish_track'
                                )),
  status            text        DEFAULT 'pending'
                                CHECK (status IN (
                                  'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
                                )),
  triggered_by      text,
  deployed_url      text,
  deploy_log        text,
  started_at        timestamptz,
  completed_at      timestamptz,
  error_message     text,
  created_at        timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_asset_metadata_tags ON public.asset_metadata USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_guardian ON public.asset_metadata (guardian);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_status ON public.asset_metadata (status);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_quality_tier ON public.asset_metadata (quality_tier);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_file_hash ON public.asset_metadata (file_hash);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_world_id ON public.asset_metadata (world_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_agent_id ON public.agent_registry (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_status ON public.agent_registry (status);
CREATE INDEX IF NOT EXISTS idx_social_queue_status ON public.social_queue (status);
CREATE INDEX IF NOT EXISTS idx_social_queue_scheduled_at ON public.social_queue (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_queue_platform_status ON public.social_queue (platform, status);
CREATE INDEX IF NOT EXISTS idx_publish_pipeline_status ON public.publish_pipeline (status);
CREATE INDEX IF NOT EXISTS idx_publish_pipeline_target ON public.publish_pipeline (target);

-- RLS
ALTER TABLE public.asset_metadata   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_registry   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_queue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_pipeline ENABLE ROW LEVEL SECURITY;

-- asset_metadata policies
CREATE POLICY "asset_metadata_anon_select" ON public.asset_metadata FOR SELECT TO anon USING (status IN ('approved', 'published'));
CREATE POLICY "asset_metadata_auth_select" ON public.asset_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "asset_metadata_auth_insert" ON public.asset_metadata FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "asset_metadata_auth_update" ON public.asset_metadata FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "asset_metadata_auth_delete" ON public.asset_metadata FOR DELETE TO authenticated USING (true);
CREATE POLICY "asset_metadata_service_all" ON public.asset_metadata FOR ALL TO service_role USING (true) WITH CHECK (true);

-- agent_registry policies
CREATE POLICY "agent_registry_auth_select" ON public.agent_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "agent_registry_auth_insert" ON public.agent_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "agent_registry_auth_update" ON public.agent_registry FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "agent_registry_auth_delete" ON public.agent_registry FOR DELETE TO authenticated USING (true);
CREATE POLICY "agent_registry_service_all" ON public.agent_registry FOR ALL TO service_role USING (true) WITH CHECK (true);

-- social_queue policies
CREATE POLICY "social_queue_auth_select" ON public.social_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "social_queue_auth_insert" ON public.social_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "social_queue_auth_update" ON public.social_queue FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "social_queue_auth_delete" ON public.social_queue FOR DELETE TO authenticated USING (true);
CREATE POLICY "social_queue_service_all" ON public.social_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- publish_pipeline policies
CREATE POLICY "publish_pipeline_auth_select" ON public.publish_pipeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "publish_pipeline_auth_insert" ON public.publish_pipeline FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "publish_pipeline_auth_update" ON public.publish_pipeline FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "publish_pipeline_auth_delete" ON public.publish_pipeline FOR DELETE TO authenticated USING (true);
CREATE POLICY "publish_pipeline_service_all" ON public.publish_pipeline FOR ALL TO service_role USING (true) WITH CHECK (true);
