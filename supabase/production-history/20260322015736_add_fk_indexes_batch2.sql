-- Production migration 20260322015736_add_fk_indexes_batch2 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Batch 2: Council + Social indexes
CREATE INDEX IF NOT EXISTS idx_council_convenings_council_id ON public.council_convenings(council_id);
CREATE INDEX IF NOT EXISTS idx_council_seats_council_id ON public.council_seats(council_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_creation_id ON public.collection_items(creation_id);
CREATE INDEX IF NOT EXISTS idx_likes_creation_id ON public.likes(creation_id);
CREATE INDEX IF NOT EXISTS idx_media_catalog_guardian ON public.media_catalog(guardian);
CREATE INDEX IF NOT EXISTS idx_media_catalog_status ON public.media_catalog(status);
