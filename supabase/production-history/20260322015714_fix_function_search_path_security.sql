-- Production migration 20260322015714_fix_function_search_path_security on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Fix mutable search_path on all 4 functions (security advisory)
CREATE OR REPLACE FUNCTION public.update_luminors_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_luminor_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_collection_prompt_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.pb_collections
    SET prompt_count = (SELECT count(*) FROM public.pb_prompts WHERE collection_id = NEW.collection_id),
        updated_at = now()
    WHERE id = NEW.collection_id;
  END IF;
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE public.pb_collections
    SET prompt_count = (SELECT count(*) FROM public.pb_prompts WHERE collection_id = OLD.collection_id),
        updated_at = now()
    WHERE id = OLD.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_luminor_usage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.luminors
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = NEW.luminor_id;
  RETURN NEW;
END;
$$;
