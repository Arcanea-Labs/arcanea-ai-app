-- Production migration 20260329124431_create_chapter_notes on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Chapter notes / feedback from readers
CREATE TABLE IF NOT EXISTS chapter_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL,
  chapter_slug TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  selected_text TEXT CHECK (char_length(selected_text) <= 500),
  position_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chapter_notes_lookup ON chapter_notes(book_id, chapter_slug);
CREATE INDEX idx_chapter_notes_user ON chapter_notes(user_id);

ALTER TABLE chapter_notes ENABLE ROW LEVEL SECURITY;

-- Users can read their own notes
CREATE POLICY "Users read own notes"
  ON chapter_notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create notes
CREATE POLICY "Users create notes"
  ON chapter_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own notes
CREATE POLICY "Users delete own notes"
  ON chapter_notes FOR DELETE
  USING (auth.uid() = user_id);
