-- Production migration 20260322015733_add_fk_indexes_batch1 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Batch 1: Prompt Books indexes
CREATE INDEX IF NOT EXISTS idx_pb_prompt_tags_tag_id ON public.pb_prompt_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_pb_prompt_tags_prompt_id ON public.pb_prompt_tags(prompt_id);
CREATE INDEX IF NOT EXISTS idx_pb_prompt_versions_prompt_id ON public.pb_prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_pb_prompt_versions_user_id ON public.pb_prompt_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_pb_prompts_collection_id ON public.pb_prompts(collection_id);
CREATE INDEX IF NOT EXISTS idx_pb_templates_user_id ON public.pb_templates(user_id);
