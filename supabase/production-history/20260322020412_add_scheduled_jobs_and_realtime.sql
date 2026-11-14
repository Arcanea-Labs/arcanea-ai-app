-- Production migration 20260322020412_add_scheduled_jobs_and_realtime on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Scheduled Jobs (pg_cron) + Realtime + DB Webhooks
-- ============================================================

-- ---- Streak Reset: daily at midnight UTC ----
-- Resets streak_days to 0 for users who haven't been active in 48 hours
SELECT cron.schedule(
  'reset-inactive-streaks',
  '0 0 * * *',
  $$
  UPDATE public.profiles
  SET streak_days = 0
  WHERE streak_days > 0
    AND updated_at < now() - interval '48 hours';
  $$
);

-- ---- Cleanup: delete old notifications (>90 days) weekly ----
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * 0',
  $$
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '90 days';
  $$
);

-- ---- Cleanup: delete orphaned chat sessions (no messages, >7 days old) ----
SELECT cron.schedule(
  'cleanup-empty-chat-sessions',
  '0 4 * * 0',
  $$
  DELETE FROM public.chat_sessions s
  WHERE NOT EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.session_id = s.id)
    AND s.created_at < now() - interval '7 days';
  $$
);

-- ---- Weekly analytics snapshot ----
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT current_date,
  total_users int,
  total_creations int,
  total_chat_sessions int,
  total_messages int,
  total_luminors int,
  total_likes bigint,
  total_views bigint,
  new_users_7d int,
  new_creations_7d int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date)
);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Only readable by service role / dashboard (no public RLS policy)
CREATE POLICY "Service role can manage snapshots" ON public.analytics_snapshots
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.analytics_snapshots TO service_role;

SELECT cron.schedule(
  'weekly-analytics-snapshot',
  '0 5 * * 1',
  $$
  INSERT INTO public.analytics_snapshots (
    total_users, total_creations, total_chat_sessions, total_messages,
    total_luminors, total_likes, total_views, new_users_7d, new_creations_7d
  )
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.creations WHERE status = 'published'),
    (SELECT count(*) FROM public.chat_sessions),
    (SELECT count(*) FROM public.chat_messages),
    (SELECT count(*) FROM public.luminors WHERE published = true),
    (SELECT COALESCE(sum(like_count), 0) FROM public.creations),
    (SELECT COALESCE(sum(view_count), 0) FROM public.creations),
    (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.creations WHERE status = 'published' AND created_at > now() - interval '7 days')
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    total_creations = EXCLUDED.total_creations,
    total_chat_sessions = EXCLUDED.total_chat_sessions,
    total_messages = EXCLUDED.total_messages,
    total_luminors = EXCLUDED.total_luminors,
    total_likes = EXCLUDED.total_likes,
    total_views = EXCLUDED.total_views,
    new_users_7d = EXCLUDED.new_users_7d,
    new_creations_7d = EXCLUDED.new_creations_7d;
  $$
);

-- ---- Enable Realtime on key tables ----
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creations;
