-- Production migration 20260404140505_claw_fleet_tables on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- =====================================================================
-- CLAW FLEET — Additional tables for Forge, Herald, Scout, Scribe
-- =====================================================================

-- Expand agent_registry to support all Claw types
ALTER TABLE public.agent_registry
  DROP CONSTRAINT IF EXISTS agent_registry_agent_type_check;
ALTER TABLE public.agent_registry
  ADD CONSTRAINT agent_registry_agent_type_check
  CHECK (agent_type IN (
    'arcanea-claw', 'claw-forge', 'claw-herald', 'claw-scout', 'claw-scribe',
    'claude-code', 'mobile-capture', 'cloud-gemini', 'cloud-suno'
  ));

-- TABLE: nft_assets — NFT creation pipeline
CREATE TABLE IF NOT EXISTS public.nft_assets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id       text        NOT NULL,
  token_id            integer,
  guardian            text,
  element             text,
  rarity              text        CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  style_pack          text,
  traits              jsonb       DEFAULT '{}',
  image_path          text,
  composed_image_path text,
  metadata_json       jsonb       DEFAULT '{}',
  metadata_path       text,
  image_cid           text,
  image_ipfs_url      text,
  image_gateway_url   text,
  metadata_cid        text,
  metadata_ipfs_url   text,
  token_uri           text,
  tx_hash             text,
  mint_provider       text,
  chain               text,
  marketplace         text,
  collection_slug     text,
  royalty_bps         integer,
  rarity_score        numeric(10,2),
  rarity_rank         integer,
  rarity_tier         text,
  status              text        DEFAULT 'pending_generation'
                                  CHECK (status IN (
                                    'pending_generation', 'generated', 'generation_failed',
                                    'composed', 'metadata_ready', 'pinned',
                                    'minted', 'listing_ready', 'listed'
                                  )),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TRIGGER nft_assets_updated_at
  BEFORE UPDATE ON public.nft_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_nft_assets_collection ON public.nft_assets (collection_id);
CREATE INDEX IF NOT EXISTS idx_nft_assets_status ON public.nft_assets (status);
CREATE INDEX IF NOT EXISTS idx_nft_assets_rarity ON public.nft_assets (rarity);

ALTER TABLE public.nft_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nft_assets_auth_select" ON public.nft_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "nft_assets_auth_insert" ON public.nft_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nft_assets_auth_update" ON public.nft_assets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nft_assets_service_all" ON public.nft_assets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- TABLE: campaign_signals — Herald + Scout intelligence signals
CREATE TABLE IF NOT EXISTS public.campaign_signals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform            text        NOT NULL,
  source_id           text        NOT NULL,
  content             text,
  engagement_score    integer     DEFAULT 0,
  query               text,
  signal_type         text        CHECK (signal_type IN (
                                    'mention', 'trend', 'market_trend',
                                    'competitor_activity', 'alpha', 'partnership'
                                  )),
  metadata            jsonb       DEFAULT '{}',
  status              text        DEFAULT 'new'
                                  CHECK (status IN ('new', 'processed', 'alpha_detected', 'actioned', 'archived')),
  detected_at         timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (platform, source_id)
);

CREATE TRIGGER campaign_signals_updated_at
  BEFORE UPDATE ON public.campaign_signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_campaign_signals_status ON public.campaign_signals (status);
CREATE INDEX IF NOT EXISTS idx_campaign_signals_platform ON public.campaign_signals (platform);
CREATE INDEX IF NOT EXISTS idx_campaign_signals_type ON public.campaign_signals (signal_type);
CREATE INDEX IF NOT EXISTS idx_campaign_signals_engagement ON public.campaign_signals (engagement_score DESC);

ALTER TABLE public.campaign_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_signals_auth_select" ON public.campaign_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaign_signals_auth_insert" ON public.campaign_signals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "campaign_signals_auth_update" ON public.campaign_signals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "campaign_signals_service_all" ON public.campaign_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
