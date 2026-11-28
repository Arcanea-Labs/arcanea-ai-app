-- Production migration 20260322020148_fix_duplicate_policies_and_indexes on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Remove Duplicate Policies & Indexes
-- ============================================================

-- ---- Remove duplicate chat_sessions policies ----
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.chat_sessions;

-- ---- Remove duplicate chat_messages policies ----
DROP POLICY IF EXISTS "Users can manage messages in own sessions" ON public.chat_messages;

-- ---- Remove duplicate indexes ----
-- chat_messages: idx_chat_messages_session duplicates idx_chat_messages_session_id
DROP INDEX IF EXISTS public.idx_chat_messages_session;

-- chat_sessions: idx_chat_sessions_luminor duplicates idx_chat_sessions_luminor_id
DROP INDEX IF EXISTS public.idx_chat_sessions_luminor;

-- chat_sessions: idx_chat_sessions_user duplicates idx_chat_sessions_user_id
DROP INDEX IF EXISTS public.idx_chat_sessions_user;

-- ---- Add missing foreign key indexes ----
CREATE INDEX IF NOT EXISTS idx_pb_prompt_tags_tag_id ON public.pb_prompt_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_pb_prompt_versions_user_id ON public.pb_prompt_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_pb_tags_collection_id ON public.pb_tags(collection_id);
