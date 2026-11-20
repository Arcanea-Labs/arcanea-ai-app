-- Production migration 20260810005055_arcanea_restrict_privileged_rpc_execution_20260810 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- SECURITY DEFINER functions are internal-only. Explicitly pin their search paths
-- and remove every browser-reachable execute grant.
ALTER FUNCTION public.check_and_unlock_gates(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.count_messages_per_session(uuid[]) SET search_path TO public, pg_temp;
ALTER FUNCTION public.generate_daily_nudges() SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_unread_notification_count() SET search_path TO public, pg_temp;
ALTER FUNCTION public.handle_like_count_change() SET search_path TO public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path TO public, pg_temp;
ALTER FUNCTION public.handle_updated_at() SET search_path TO public, pg_temp;
ALTER FUNCTION public.increment_view_count(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.initialize_user_credits(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.mark_all_notifications_read() SET search_path TO public, pg_temp;
ALTER FUNCTION public.mark_notifications_read(uuid[]) SET search_path TO public, pg_temp;
ALTER FUNCTION public.notify_on_follow() SET search_path TO public, pg_temp;
ALTER FUNCTION public.notify_on_like() SET search_path TO public, pg_temp;
ALTER FUNCTION public.set_active_cover(uuid, uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.touch_ingested_docs() SET search_path TO public, pg_temp;
ALTER FUNCTION public.trg_check_gates_on_creation() SET search_path TO public, pg_temp;
ALTER FUNCTION public.trg_check_gates_on_follow() SET search_path TO public, pg_temp;
ALTER FUNCTION public.trg_check_gates_on_like() SET search_path TO public, pg_temp;
ALTER FUNCTION public.trg_check_gates_on_luminor() SET search_path TO public, pg_temp;
ALTER FUNCTION public.trg_check_gates_on_xp_change() SET search_path TO public, pg_temp;
ALTER FUNCTION public.unlock_gate(uuid, integer, text) SET search_path TO public, pg_temp;

REVOKE ALL ON FUNCTION public.check_and_unlock_gates(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_messages_per_session(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_daily_nudges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_unread_notification_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_like_count_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_view_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_user_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_active_cover(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_ingested_docs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_check_gates_on_creation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_check_gates_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_check_gates_on_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_check_gates_on_luminor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_check_gates_on_xp_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unlock_gate(uuid, integer, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_and_unlock_gates(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_messages_per_session(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_daily_nudges() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_like_count_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.initialize_user_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_on_follow() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_on_like() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_active_cover(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_ingested_docs() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_check_gates_on_creation() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_check_gates_on_follow() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_check_gates_on_like() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_check_gates_on_luminor() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_check_gates_on_xp_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_gate(uuid, integer, text) TO service_role;

-- Future functions must be deliberately exposed rather than inheriting PUBLIC execution.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
