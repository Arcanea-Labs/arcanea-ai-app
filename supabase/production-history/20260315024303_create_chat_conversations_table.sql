-- Production migration 20260315024303_create_chat_conversations_table on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Chat Conversations — Persistent chat history
-- Stores full conversation threads with messages, Luminor associations, and model info.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  title TEXT NOT NULL DEFAULT 'New Conversation',
  
  -- Luminor association (which Luminor was active, if any)
  luminor_id UUID REFERENCES luminors(id) ON DELETE SET NULL,
  
  -- Model used
  model_id TEXT,
  focus_mode TEXT DEFAULT 'auto',
  
  -- Messages stored as JSONB array
  -- Each message: { role: 'user'|'assistant', content: string, modelId?: string, timestamp: string }
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Message count (denormalized for listing)
  message_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_luminor ON chat_conversations(luminor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON chat_conversations(updated_at DESC);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_luminors_updated_at();

-- Increment function for luminor usage (referenced by luminor-service.ts)
CREATE OR REPLACE FUNCTION increment_luminor_usage(luminor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE luminors 
  SET usage_count = usage_count + 1 
  WHERE id = luminor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
