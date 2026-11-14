-- Production migration 20260322020135_fix_rls_initplan_optimization on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Fix RLS InitPlan Optimization
-- Wraps auth.uid() in (select ...) to prevent per-row re-evaluation
-- Affects 30+ policies across all tables
-- ============================================================

-- ---- chat_sessions ----
DROP POLICY IF EXISTS "chat_sessions_select" ON public.chat_sessions;
CREATE POLICY "chat_sessions_select" ON public.chat_sessions FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "chat_sessions_insert" ON public.chat_sessions;
CREATE POLICY "chat_sessions_insert" ON public.chat_sessions FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "chat_sessions_update" ON public.chat_sessions;
CREATE POLICY "chat_sessions_update" ON public.chat_sessions FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "chat_sessions_delete" ON public.chat_sessions;
CREATE POLICY "chat_sessions_delete" ON public.chat_sessions FOR DELETE
  USING (user_id = (select auth.uid()));

-- ---- chat_messages ----
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "chat_messages_delete" ON public.chat_messages;
CREATE POLICY "chat_messages_delete" ON public.chat_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = (select auth.uid())
  ));

-- ---- chat_conversations ----
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own conversations" ON public.chat_conversations;
CREATE POLICY "Users can create own conversations" ON public.chat_conversations FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations" ON public.chat_conversations FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete own conversations" ON public.chat_conversations FOR DELETE
  USING (user_id = (select auth.uid()));

-- ---- luminor_councils ----
DROP POLICY IF EXISTS "councils_select_own" ON public.luminor_councils;
CREATE POLICY "councils_select_own" ON public.luminor_councils FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "councils_insert_own" ON public.luminor_councils;
CREATE POLICY "councils_insert_own" ON public.luminor_councils FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "councils_update_own" ON public.luminor_councils;
CREATE POLICY "councils_update_own" ON public.luminor_councils FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ---- council_seats ----
DROP POLICY IF EXISTS "seats_select_own" ON public.council_seats;
CREATE POLICY "seats_select_own" ON public.council_seats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.luminor_councils c
    WHERE c.id = council_seats.council_id AND c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "seats_insert_own" ON public.council_seats;
CREATE POLICY "seats_insert_own" ON public.council_seats FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.luminor_councils c
    WHERE c.id = council_seats.council_id AND c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "seats_update_own" ON public.council_seats;
CREATE POLICY "seats_update_own" ON public.council_seats FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.luminor_councils c
    WHERE c.id = council_seats.council_id AND c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "seats_delete_own_custom" ON public.council_seats;
CREATE POLICY "seats_delete_own_custom" ON public.council_seats FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.luminor_councils c
    WHERE c.id = council_seats.council_id AND c.user_id = (select auth.uid())
  ));

-- ---- council_convenings ----
DROP POLICY IF EXISTS "convenings_select_own" ON public.council_convenings;
CREATE POLICY "convenings_select_own" ON public.council_convenings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.luminor_councils c
    WHERE c.id = council_convenings.council_id AND c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "convenings_insert_own" ON public.council_convenings;
CREATE POLICY "convenings_insert_own" ON public.council_convenings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.luminor_councils c
    WHERE c.id = council_convenings.council_id AND c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "convenings_update_own" ON public.council_convenings;
CREATE POLICY "convenings_update_own" ON public.council_convenings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.luminor_councils c
    WHERE c.id = council_convenings.council_id AND c.user_id = (select auth.uid())
  ));

-- ---- reading_progress ----
DROP POLICY IF EXISTS "Users can view own reading progress" ON public.reading_progress;
CREATE POLICY "Users can view own reading progress" ON public.reading_progress FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own reading progress" ON public.reading_progress;
CREATE POLICY "Users can insert own reading progress" ON public.reading_progress FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own reading progress" ON public.reading_progress;
CREATE POLICY "Users can update own reading progress" ON public.reading_progress FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ---- luminors ----
DROP POLICY IF EXISTS "Creators can view own luminors" ON public.luminors;
CREATE POLICY "Creators can view own luminors" ON public.luminors FOR SELECT
  USING (creator_id = (select auth.uid()));

DROP POLICY IF EXISTS "Creators can forge luminors" ON public.luminors;
CREATE POLICY "Creators can forge luminors" ON public.luminors FOR INSERT
  WITH CHECK (creator_id = (select auth.uid()));

DROP POLICY IF EXISTS "Creators can update own luminors" ON public.luminors;
CREATE POLICY "Creators can update own luminors" ON public.luminors FOR UPDATE
  USING (creator_id = (select auth.uid()));

DROP POLICY IF EXISTS "Creators can delete own luminors" ON public.luminors;
CREATE POLICY "Creators can delete own luminors" ON public.luminors FOR DELETE
  USING (creator_id = (select auth.uid()));

-- ---- pb_collections ----
DROP POLICY IF EXISTS "Users can manage own collections" ON public.pb_collections;
CREATE POLICY "Users can manage own collections" ON public.pb_collections FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---- pb_prompts ----
DROP POLICY IF EXISTS "Users can manage own prompts" ON public.pb_prompts;
CREATE POLICY "Users can manage own prompts" ON public.pb_prompts FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---- pb_tags ----
DROP POLICY IF EXISTS "Users can manage own tags" ON public.pb_tags;
CREATE POLICY "Users can manage own tags" ON public.pb_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pb_collections c
    WHERE c.id = pb_tags.collection_id AND c.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pb_collections c
    WHERE c.id = pb_tags.collection_id AND c.user_id = (select auth.uid())
  ));

-- ---- pb_prompt_tags ----
DROP POLICY IF EXISTS "Users can manage own prompt tags" ON public.pb_prompt_tags;
CREATE POLICY "Users can manage own prompt tags" ON public.pb_prompt_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.pb_prompts p
    WHERE p.id = pb_prompt_tags.prompt_id AND p.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pb_prompts p
    WHERE p.id = pb_prompt_tags.prompt_id AND p.user_id = (select auth.uid())
  ));

-- ---- pb_prompt_versions ----
DROP POLICY IF EXISTS "Users can view own prompt versions" ON public.pb_prompt_versions;
CREATE POLICY "Users can view own prompt versions" ON public.pb_prompt_versions FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own prompt versions" ON public.pb_prompt_versions;
CREATE POLICY "Users can insert own prompt versions" ON public.pb_prompt_versions FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- ---- pb_templates ----
DROP POLICY IF EXISTS "Users can manage own templates" ON public.pb_templates;
CREATE POLICY "Users can manage own templates" ON public.pb_templates FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---- feedback ----
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.feedback;
CREATE POLICY "Authenticated users can submit feedback" ON public.feedback FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ---- arcanea ----
DROP POLICY IF EXISTS "Authenticated users can insert arcanea" ON public.arcanea;
CREATE POLICY "Authenticated users can insert arcanea" ON public.arcanea FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
