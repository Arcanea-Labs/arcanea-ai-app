-- Production migration 20260322031951_tighten_leaderboard_rls on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Drop overly permissive policy
DROP POLICY IF EXISTS "System can manage leaderboard" ON public.leaderboard_cache;

-- Only service role (edge functions) can write to leaderboard
CREATE POLICY "Service role manages leaderboard"
  ON public.leaderboard_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
