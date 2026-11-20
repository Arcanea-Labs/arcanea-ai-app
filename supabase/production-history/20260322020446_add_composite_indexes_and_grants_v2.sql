-- Production migration 20260322020446_add_composite_indexes_and_grants_v2 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Composite Indexes + Grants (fixed column names)
-- ============================================================

-- Creations: common feed query
CREATE INDEX IF NOT EXISTS idx_creations_feed
  ON public.creations(status, visibility, created_at DESC)
  WHERE status = 'published' AND visibility = 'public';

-- Creations: user's own creations sorted
CREATE INDEX IF NOT EXISTS idx_creations_user_date
  ON public.creations(user_id, created_at DESC);

-- Creations: element + gate filtering
CREATE INDEX IF NOT EXISTS idx_creations_element_gate
  ON public.creations(element, gate)
  WHERE status = 'published';

-- Chat: session messages ordered
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_order
  ON public.chat_messages(session_id, created_at ASC);

-- Notifications: user's recent unread
CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
  ON public.notifications(user_id, created_at DESC)
  WHERE read = false;

-- Profiles: display_name lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower
  ON public.profiles(lower(display_name));

-- Profiles: magic rank filtering
CREATE INDEX IF NOT EXISTS idx_profiles_magic_rank
  ON public.profiles(magic_rank, xp DESC);

-- Likes: check if user liked
CREATE INDEX IF NOT EXISTS idx_likes_user_creation
  ON public.likes(user_id, creation_id);

-- Follows: follower/following count queries
CREATE INDEX IF NOT EXISTS idx_follows_following
  ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON public.follows(follower_id);

-- Grant search functions
GRANT EXECUTE ON FUNCTION public.search_creations(text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fuzzy_search_creations(text, real, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_gate(uuid, int, text) TO authenticated, service_role;

-- Grant analytics views
GRANT SELECT ON public.platform_stats TO authenticated;
GRANT SELECT ON public.user_engagement TO authenticated;
GRANT SELECT ON public.trending_creations TO anon, authenticated;
GRANT SELECT ON public.element_distribution TO anon, authenticated;
