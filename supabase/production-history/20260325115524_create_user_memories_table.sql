-- Production migration 20260325115524_create_user_memories_table on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('preference', 'background', 'goal', 'project', 'style', 'general')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX idx_user_memories_category ON user_memories(user_id, category);

ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own memories"
  ON user_memories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON user_memories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON user_memories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON user_memories FOR UPDATE USING (auth.uid() = user_id);
