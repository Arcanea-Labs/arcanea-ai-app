-- Production migration 20260322020514_fix_view_security_and_policies on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Fix View Security + Policy Tightening
-- ============================================================

-- ---- Fix SECURITY DEFINER views → SECURITY INVOKER ----
-- Must recreate views with security_invoker = true

-- Platform Stats
DROP VIEW IF EXISTS public.platform_stats;
CREATE VIEW public.platform_stats WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.profiles) as total_users,
  (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days') as new_users_7d,
  (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days') as new_users_30d,
  (SELECT count(*) FROM public.creations WHERE status = 'published') as total_creations,
  (SELECT count(*) FROM public.creations WHERE status = 'published' AND created_at > now() - interval '7 days') as new_creations_7d,
  (SELECT count(*) FROM public.chat_sessions) as total_chat_sessions,
  (SELECT count(*) FROM public.chat_messages) as total_chat_messages,
  (SELECT count(*) FROM public.luminors WHERE published = true) as total_luminors,
  (SELECT count(*) FROM public.luminor_councils) as total_councils,
  (SELECT COALESCE(sum(like_count), 0) FROM public.creations) as total_likes,
  (SELECT COALESCE(sum(view_count), 0) FROM public.creations) as total_views;

-- User Engagement
DROP VIEW IF EXISTS public.user_engagement;
CREATE VIEW public.user_engagement WITH (security_invoker = true) AS
SELECT
  p.id as user_id, p.display_name, p.magic_rank, p.gates_open, p.xp, p.level, p.streak_days,
  (SELECT count(*) FROM public.creations c WHERE c.user_id = p.id AND c.status = 'published') as creation_count,
  (SELECT count(*) FROM public.chat_sessions cs WHERE cs.user_id = p.id) as chat_session_count,
  (SELECT count(*) FROM public.likes l WHERE l.user_id = p.id) as likes_given,
  (SELECT COALESCE(sum(c2.like_count), 0) FROM public.creations c2 WHERE c2.user_id = p.id) as likes_received,
  (SELECT COALESCE(sum(c3.view_count), 0) FROM public.creations c3 WHERE c3.user_id = p.id) as views_received,
  p.created_at as joined_at, p.updated_at as last_active
FROM public.profiles p;

-- Trending Creations
DROP VIEW IF EXISTS public.trending_creations;
CREATE VIEW public.trending_creations WITH (security_invoker = true) AS
SELECT c.id, c.title, c.type, c.user_id, p.display_name as creator_name,
  c.like_count, c.view_count, c.element, c.gate, c.guardian, c.created_at,
  CASE WHEN (c.like_count + c.view_count) > 0 THEN
    (c.like_count::numeric + 1.9208) / (c.like_count + c.view_count + 3.8416)
  ELSE 0 END as trending_score
FROM public.creations c
LEFT JOIN public.profiles p ON p.id = c.user_id
WHERE c.status = 'published' AND c.visibility = 'public'
  AND c.created_at > now() - interval '30 days'
ORDER BY trending_score DESC;

-- Element Distribution
DROP VIEW IF EXISTS public.element_distribution;
CREATE VIEW public.element_distribution WITH (security_invoker = true) AS
SELECT element, count(*) as creation_count,
  COALESCE(sum(like_count), 0) as total_likes,
  COALESCE(sum(view_count), 0) as total_views,
  round(count(*)::numeric / NULLIF((SELECT count(*) FROM public.creations WHERE status = 'published'), 0) * 100, 1) as percentage
FROM public.creations
WHERE status = 'published' AND element IS NOT NULL
GROUP BY element ORDER BY creation_count DESC;

-- Re-grant after recreating views
GRANT SELECT ON public.platform_stats TO authenticated;
GRANT SELECT ON public.user_engagement TO authenticated;
GRANT SELECT ON public.trending_creations TO anon, authenticated;
GRANT SELECT ON public.element_distribution TO anon, authenticated;

-- ---- Fix analytics_snapshots RLS: restrict to service_role only ----
DROP POLICY IF EXISTS "Service role can manage snapshots" ON public.analytics_snapshots;
-- No permissive policy needed — service_role bypasses RLS by default
-- Add a restrictive read policy for authenticated users (dashboard)
CREATE POLICY "Authenticated can view snapshots" ON public.analytics_snapshots FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- ---- Fix notifications insert: restrict to trigger functions (service_role) ----
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
-- Trigger functions run as SECURITY DEFINER (owner), so no explicit INSERT policy needed
-- for authenticated. The triggers handle insertion. Service role bypasses RLS.

-- ---- Add missing FK index on notifications.actor_id ----
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);
