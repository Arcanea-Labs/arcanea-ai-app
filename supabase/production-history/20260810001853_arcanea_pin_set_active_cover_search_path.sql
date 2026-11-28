-- Production migration 20260810001853_arcanea_pin_set_active_cover_search_path on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

ALTER FUNCTION public.set_active_cover(uuid, uuid) SET search_path TO public, pg_temp;
