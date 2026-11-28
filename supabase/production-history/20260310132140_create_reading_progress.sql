-- Production migration 20260310132140_create_reading_progress on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Reading progress tracking for the Library
-- Tracks which texts a user has read and their completion percentage

CREATE TABLE public.reading_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_slug text NOT NULL,
  collection_slug text NOT NULL,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, text_slug)
);

-- Index for fast lookups by user
CREATE INDEX idx_reading_progress_user_id ON public.reading_progress(user_id);

-- Index for collection-level progress queries
CREATE INDEX idx_reading_progress_collection ON public.reading_progress(user_id, collection_slug);

-- Enable RLS
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can view own reading progress"
  ON public.reading_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own reading progress"
  ON public.reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own reading progress"
  ON public.reading_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER set_reading_progress_updated_at
  BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comment
COMMENT ON TABLE public.reading_progress IS 'Tracks user reading progress through the Library of Arcanea. Supports per-text completion and collection-level aggregation.';
