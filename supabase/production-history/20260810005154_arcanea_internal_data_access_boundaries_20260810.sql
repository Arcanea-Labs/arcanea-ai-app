-- Production migration 20260810005154_arcanea_internal_data_access_boundaries_20260810 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Internal operations data is server-only. These tables are empty and have no
-- reviewed browser call sites, so broad authenticated policies are removed.
REVOKE ALL ON TABLE public.agent_registry,
  public.asset_metadata,
  public.campaign_signals,
  public.claw_events,
  public.nft_assets,
  public.publish_pipeline,
  public.social_queue,
  public.user_oauth_tokens
FROM anon, authenticated;

DROP POLICY IF EXISTS "agent_registry_auth_delete" ON public.agent_registry;
DROP POLICY IF EXISTS "agent_registry_auth_insert" ON public.agent_registry;
DROP POLICY IF EXISTS "agent_registry_auth_select" ON public.agent_registry;
DROP POLICY IF EXISTS "agent_registry_auth_update" ON public.agent_registry;

DROP POLICY IF EXISTS "asset_metadata_anon_select" ON public.asset_metadata;
DROP POLICY IF EXISTS "asset_metadata_auth_delete" ON public.asset_metadata;
DROP POLICY IF EXISTS "asset_metadata_auth_insert" ON public.asset_metadata;
DROP POLICY IF EXISTS "asset_metadata_auth_select" ON public.asset_metadata;
DROP POLICY IF EXISTS "asset_metadata_auth_update" ON public.asset_metadata;

DROP POLICY IF EXISTS "campaign_signals_auth_insert" ON public.campaign_signals;
DROP POLICY IF EXISTS "campaign_signals_auth_select" ON public.campaign_signals;
DROP POLICY IF EXISTS "campaign_signals_auth_update" ON public.campaign_signals;

DROP POLICY IF EXISTS "claw_events_auth_all" ON public.claw_events;

DROP POLICY IF EXISTS "nft_assets_auth_insert" ON public.nft_assets;
DROP POLICY IF EXISTS "nft_assets_auth_select" ON public.nft_assets;
DROP POLICY IF EXISTS "nft_assets_auth_update" ON public.nft_assets;

DROP POLICY IF EXISTS "publish_pipeline_auth_delete" ON public.publish_pipeline;
DROP POLICY IF EXISTS "publish_pipeline_auth_insert" ON public.publish_pipeline;
DROP POLICY IF EXISTS "publish_pipeline_auth_select" ON public.publish_pipeline;
DROP POLICY IF EXISTS "publish_pipeline_auth_update" ON public.publish_pipeline;

DROP POLICY IF EXISTS "social_queue_auth_delete" ON public.social_queue;
DROP POLICY IF EXISTS "social_queue_auth_insert" ON public.social_queue;
DROP POLICY IF EXISTS "social_queue_auth_select" ON public.social_queue;
DROP POLICY IF EXISTS "social_queue_auth_update" ON public.social_queue;

DROP POLICY IF EXISTS "service role manages oauth tokens" ON public.user_oauth_tokens;
CREATE POLICY "user_oauth_tokens_service_role_only"
  ON public.user_oauth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Existing user-owned records cannot be read, reassigned, or globally written
-- by anonymous users.
ALTER POLICY tasks_insert ON public.agent_tasks TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY tasks_select ON public.agent_tasks TO authenticated
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY tasks_update ON public.agent_tasks TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can delete their own memories" ON public.user_memories TO authenticated
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert their own memories" ON public.user_memories TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can read their own memories" ON public.user_memories TO authenticated
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own memories" ON public.user_memories TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY memory_items_delete ON public.luminor_memory_items TO authenticated
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY memory_items_insert ON public.luminor_memory_items TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY memory_items_select ON public.luminor_memory_items TO authenticated
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY keys_insert ON public.platform_api_keys TO authenticated
  WITH CHECK (platform_id IN (
    SELECT p.id FROM public.platforms p WHERE p.owner_id = (SELECT auth.uid())
  ));
ALTER POLICY keys_select ON public.platform_api_keys TO authenticated
  USING (platform_id IN (
    SELECT p.id FROM public.platforms p WHERE p.owner_id = (SELECT auth.uid())
  ));
ALTER POLICY keys_update ON public.platform_api_keys TO authenticated
  USING (platform_id IN (
    SELECT p.id FROM public.platforms p WHERE p.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (platform_id IN (
    SELECT p.id FROM public.platforms p WHERE p.owner_id = (SELECT auth.uid())
  ));

-- New public-schema objects require deliberate grants before Data API exposure.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;
