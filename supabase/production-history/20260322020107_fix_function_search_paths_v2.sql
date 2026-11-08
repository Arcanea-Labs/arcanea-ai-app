-- Production migration 20260322020107_fix_function_search_paths_v2 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Fix Function Search Paths (remaining)
-- ============================================================

-- Fix update_luminors_updated_at
CREATE OR REPLACE FUNCTION public.update_luminors_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix generate_luminor_slug
CREATE OR REPLACE FUNCTION public.generate_luminor_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    IF EXISTS (SELECT 1 FROM public.luminors WHERE slug = NEW.slug AND id != NEW.id) THEN
      NEW.slug = NEW.slug || '-' || substring(gen_random_uuid()::text, 1, 8);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_collection_prompt_count
CREATE OR REPLACE FUNCTION public.update_collection_prompt_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pb_collections SET prompt_count = prompt_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pb_collections SET prompt_count = prompt_count - 1 WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix increment_luminor_usage - must drop first due to parameter rename
DROP FUNCTION IF EXISTS public.increment_luminor_usage(uuid);
CREATE FUNCTION public.increment_luminor_usage(p_luminor_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.luminors
  SET usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = now()
  WHERE id = p_luminor_id;
END;
$$;
