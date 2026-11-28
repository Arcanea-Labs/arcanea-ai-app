-- Production migration 20260417152017_world_graph_source_document_link on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Add source_document_id cross-reference so world graph nodes can
-- point back to the ingested_document they were linked from.
-- Safe on existing rows (nullable). Indexed for the reverse lookup.

ALTER TABLE public.world_characters
  ADD COLUMN IF NOT EXISTS source_document_id UUID
    REFERENCES public.ingested_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_world_characters_source_document
  ON public.world_characters (source_document_id)
  WHERE source_document_id IS NOT NULL;

ALTER TABLE public.world_locations
  ADD COLUMN IF NOT EXISTS source_document_id UUID
    REFERENCES public.ingested_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_world_locations_source_document
  ON public.world_locations (source_document_id)
  WHERE source_document_id IS NOT NULL;

COMMENT ON COLUMN public.world_characters.source_document_id IS
  'Link to ingested_documents row this character was created from (via Studio classify → save_to_vault flow).';

COMMENT ON COLUMN public.world_locations.source_document_id IS
  'Link to ingested_documents row this location was created from.';
