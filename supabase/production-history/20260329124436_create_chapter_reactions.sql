-- Production migration 20260329124436_create_chapter_reactions on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Simple reactions (hearts/bookmarks) on chapters
CREATE TABLE IF NOT EXISTS chapter_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter_slug TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'bookmark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id, chapter_slug, reaction_type)
);

CREATE INDEX idx_chapter_reactions_lookup ON chapter_reactions(book_id, chapter_slug);

ALTER TABLE chapter_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reaction counts"
  ON chapter_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users manage own reactions"
  ON chapter_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own reactions"
  ON chapter_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- View for aggregated reaction counts (public)
CREATE OR REPLACE VIEW chapter_reaction_counts AS
SELECT
  book_id,
  chapter_slug,
  reaction_type,
  COUNT(*) as count
FROM chapter_reactions
GROUP BY book_id, chapter_slug, reaction_type;
