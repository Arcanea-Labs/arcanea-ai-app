-- Production migration 20260227110919_like_count_sync_and_view_increment on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Sync like_count on creations when likes are inserted/deleted
CREATE OR REPLACE FUNCTION public.handle_like_count_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.creations
    SET like_count = like_count + 1
    WHERE id = NEW.creation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.creations
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.creation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like_count_change();

-- Increment view_count atomically (called from API)
CREATE OR REPLACE FUNCTION public.increment_view_count(creation_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.creations
  SET view_count = view_count + 1
  WHERE id = creation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
