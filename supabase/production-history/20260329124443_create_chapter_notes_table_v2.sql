-- Production migration 20260329124443_create_chapter_notes_table_v2 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Index already exists from a prior attempt, create only what's missing
CREATE INDEX IF NOT EXISTS idx_chapter_notes_chapter ON chapter_notes(book_id, chapter_slug);
CREATE INDEX IF NOT EXISTS idx_chapter_notes_user ON chapter_notes(user_id);

-- RLS + policy (idempotent: drops policy if it exists, then recreates)
ALTER TABLE chapter_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chapter_notes' AND policyname = 'Users manage own notes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users manage own notes" ON chapter_notes FOR ALL
        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;
