-- Production migration 20260322031331_create_analytics_and_leaderboard on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Analytics events for tracking user engagement
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'creation', 'chat', 'gate_progress', 'library_read', 'prompt_use', 'share', 'login')),
  event_data jsonb DEFAULT '{}',
  page_path text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_user ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_created ON public.analytics_events(created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Leaderboard materialized view (refreshed periodically)
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  total_xp integer DEFAULT 0,
  gates_open integer DEFAULT 0,
  creation_count integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  magic_rank text DEFAULT 'Apprentice',
  rank_position integer,
  period text DEFAULT 'all_time' CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period)
);

CREATE INDEX idx_leaderboard_rank ON public.leaderboard_cache(period, rank_position);
CREATE INDEX idx_leaderboard_xp ON public.leaderboard_cache(period, total_xp DESC);

ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard"
  ON public.leaderboard_cache FOR SELECT
  USING (true);

CREATE POLICY "System can manage leaderboard"
  ON public.leaderboard_cache FOR ALL
  USING (true);
