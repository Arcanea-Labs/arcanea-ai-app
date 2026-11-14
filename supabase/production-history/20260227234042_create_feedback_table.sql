-- Production migration 20260227234042_create_feedback_table on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Feedback table for user-submitted feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('bug', 'feature', 'general')),
  message TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 255),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS: service role can insert (API route uses service role key)
-- Users can read their own feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.feedback
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Index for admin queries
CREATE INDEX idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX idx_feedback_type ON public.feedback (type);
