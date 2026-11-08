-- Production migration 20260301024726_fix_security_advisories_rls_policies on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- =============================================================================
-- Migration: fix_security_advisories_rls_policies
-- Date: 2026-03-01
-- Purpose: Fix 2 security advisories + 2 performance advisories on feedback
--          and arcanea tables.
--
-- Changes:
--   1. public.arcanea   — add RLS policies (public read, authenticated insert)
--   2. public.feedback  — drop overly permissive "Service role full access" policy
--   3. public.feedback  — drop and recreate "Users can read own feedback" using
--                         (select auth.uid()) for RLS init-plan performance
--   4. public.feedback  — add "Anyone can submit feedback" INSERT policy
--   5. public.feedback  — add covering index on user_id (fixes unindexed FK)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. public.arcanea — RLS policies
--    Table has only (id bigint, created_at timestamptz), no user_id column.
--    Strategy: public SELECT, authenticated INSERT only.
-- -----------------------------------------------------------------------------

CREATE POLICY "Anyone can read arcanea"
  ON public.arcanea
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert arcanea"
  ON public.arcanea
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 2. public.feedback — drop the overly permissive catch-all policy
--    "Service role full access" applied to ALL roles (including anon) with
--    USING (true) AND WITH CHECK (true) for ALL commands — this bypasses RLS.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role full access" ON public.feedback;


-- -----------------------------------------------------------------------------
-- 3. public.feedback — recreate "Users can read own feedback"
--    Replace bare auth.uid() with (select auth.uid()) to avoid per-row
--    re-evaluation of the auth init plan (fixes auth_rls_initplan advisory).
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;

CREATE POLICY "Users can read own feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- 4. public.feedback — add INSERT policy for anonymous + authenticated users
--    Feedback submission should be open (anyone can report an issue / send
--    feedback). The row is insert-only for the submitter; only the owner can
--    read it back (policy above).
-- -----------------------------------------------------------------------------

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 5. public.feedback — covering index on user_id
--    Fixes the unindexed foreign key advisory and supports the RLS SELECT
--    policy which filters on user_id.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_feedback_user_id
  ON public.feedback (user_id);
