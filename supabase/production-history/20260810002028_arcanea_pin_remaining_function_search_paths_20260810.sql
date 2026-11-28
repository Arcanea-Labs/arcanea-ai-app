-- Production migration 20260810002028_arcanea_pin_remaining_function_search_paths_20260810 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


ALTER FUNCTION public.calculate_revenue_split(integer, text) SET search_path TO public, pg_temp;
ALTER FUNCTION public.initialize_user_credits(uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.match_agents(vector, double precision, integer) SET search_path TO public, pg_temp;
ALTER FUNCTION public.match_user_memories(vector, uuid, double precision, integer) SET search_path TO public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path TO public, pg_temp;
ALTER FUNCTION public.touch_updated_at() SET search_path TO public, pg_temp;
ALTER FUNCTION public.update_book_rating_stats() SET search_path TO public, pg_temp;
ALTER FUNCTION public.update_guardian_score() SET search_path TO public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path TO public, pg_temp;
