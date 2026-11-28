-- Production migration 20260417151635_studio_ingestion on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Studio Ingestion — Universal creator memory layer
-- Migration: 2026-04-17

CREATE TABLE IF NOT EXISTS public.ingested_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id UUID REFERENCES public.worlds(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  jsonml_content JSONB,
  storage_path TEXT,
  classification TEXT NOT NULL DEFAULT 'reference',
  classification_confidence NUMERIC(4,3) DEFAULT 0.5,
  source_type TEXT NOT NULL DEFAULT 'paste'
    CHECK (source_type IN ('paste','url','file','drive','obsidian','syncthing','github','notion','chat')),
  source_uri TEXT,
  source_metadata JSONB DEFAULT '{}'::jsonb,
  embedding extensions.vector(1536),
  word_count INTEGER DEFAULT 0,
  token_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_ingested_docs_embedding
  ON public.ingested_documents
  USING hnsw (embedding extensions.vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingested_docs_user_created
  ON public.ingested_documents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingested_docs_user_classification
  ON public.ingested_documents (user_id, classification, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingested_docs_world
  ON public.ingested_documents (world_id, created_at DESC)
  WHERE world_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingested_docs_source
  ON public.ingested_documents (user_id, source_type);

CREATE INDEX IF NOT EXISTS idx_ingested_docs_tags
  ON public.ingested_documents
  USING gin (tags);

ALTER TABLE public.ingested_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own ingested docs"
  ON public.ingested_documents
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users insert own ingested docs"
  ON public.ingested_documents
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users update own ingested docs"
  ON public.ingested_documents
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users delete own ingested docs"
  ON public.ingested_documents
  FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.touch_ingested_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_ingested_docs_touch ON public.ingested_documents;
CREATE TRIGGER tr_ingested_docs_touch
  BEFORE UPDATE ON public.ingested_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ingested_docs();

CREATE OR REPLACE FUNCTION public.match_ingested_documents(
  query_embedding extensions.vector(1536),
  match_count INT DEFAULT 8,
  p_user_id UUID DEFAULT NULL,
  p_world_id UUID DEFAULT NULL,
  p_classification TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  markdown_content TEXT,
  classification TEXT,
  source_type TEXT,
  world_id UUID,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  similarity NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT
    d.id,
    d.title,
    d.markdown_content,
    d.classification,
    d.source_type,
    d.world_id,
    d.tags,
    d.created_at,
    (1 - (d.embedding <=> query_embedding))::NUMERIC AS similarity
  FROM public.ingested_documents d
  WHERE d.embedding IS NOT NULL
    AND (p_user_id IS NULL OR d.user_id = p_user_id)
    AND (p_world_id IS NULL OR d.world_id = p_world_id)
    AND (p_classification IS NULL OR d.classification = p_classification)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE TABLE IF NOT EXISTS public.user_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google','notion','github','linear','obsidian','syncthing')),
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages oauth tokens"
  ON public.user_oauth_tokens
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_provider
  ON public.user_oauth_tokens (user_id, provider);

DROP TRIGGER IF EXISTS tr_oauth_tokens_touch ON public.user_oauth_tokens;
CREATE TRIGGER tr_oauth_tokens_touch
  BEFORE UPDATE ON public.user_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ingested_docs();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingested_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ingested_documents(extensions.vector, INT, UUID, UUID, TEXT) TO authenticated;

COMMENT ON TABLE public.ingested_documents IS
  'Studio universal ingestion layer. Content from /studio DropZone as portable markdown + JSONML with pgvector embeddings for semantic Luminor retrieval.';
COMMENT ON COLUMN public.ingested_documents.classification IS
  'Auto-detected content type: character/location/magic/scene/lore/reference/chapter/note.';
COMMENT ON COLUMN public.ingested_documents.source_type IS
  'Origin: paste | url | file | drive | obsidian | syncthing | github | notion | chat.';
COMMENT ON TABLE public.user_oauth_tokens IS
  'Encrypted OAuth tokens for connected sources. Service-role only.';
