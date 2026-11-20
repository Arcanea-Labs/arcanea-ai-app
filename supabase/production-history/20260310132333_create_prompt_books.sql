-- Production migration 20260310132333_create_prompt_books on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Prompt Books — Complete schema for prompt management system
-- Tables: pb_collections, pb_prompts, pb_tags, pb_prompt_tags, pb_prompt_versions, pb_templates

-- =====================================================================
-- Collections
-- =====================================================================
CREATE TABLE public.pb_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  guardian_id text CHECK (guardian_id IN ('lyssandria','leyla','draconia','maylinn','alera','lyria','aiyami','elara','ino','shinkami')),
  element text CHECK (element IN ('fire','water','earth','wind','void')),
  parent_id uuid REFERENCES public.pb_collections(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_pinned boolean DEFAULT false NOT NULL,
  is_archived boolean DEFAULT false NOT NULL,
  visibility text DEFAULT 'private' NOT NULL CHECK (visibility IN ('private','shared','public')),
  share_token text UNIQUE,
  prompt_count integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_pb_collections_user ON public.pb_collections(user_id);
CREATE INDEX idx_pb_collections_parent ON public.pb_collections(parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE public.pb_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collections"
  ON public.pb_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public collections are visible"
  ON public.pb_collections FOR SELECT
  USING (visibility = 'public');

CREATE TRIGGER set_pb_collections_updated_at
  BEFORE UPDATE ON public.pb_collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- Prompts
-- =====================================================================
CREATE TABLE public.pb_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.pb_collections(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text DEFAULT '' NOT NULL,
  negative_content text,
  system_prompt text,
  prompt_type text DEFAULT 'general' NOT NULL CHECK (prompt_type IN ('general','txt2img','img2img','chat','chain','few_shot','code','writing','analysis')),
  is_template boolean DEFAULT false NOT NULL,
  template_variables jsonb DEFAULT '[]' NOT NULL,
  context_config jsonb DEFAULT '{}' NOT NULL,
  few_shot_examples jsonb DEFAULT '[]' NOT NULL,
  chain_steps jsonb DEFAULT '[]' NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_pinned boolean DEFAULT false NOT NULL,
  is_favorite boolean DEFAULT false NOT NULL,
  is_archived boolean DEFAULT false NOT NULL,
  use_count integer DEFAULT 0 NOT NULL,
  last_used_at timestamptz,
  version integer DEFAULT 1 NOT NULL,
  metadata jsonb DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_pb_prompts_user ON public.pb_prompts(user_id);
CREATE INDEX idx_pb_prompts_collection ON public.pb_prompts(collection_id) WHERE collection_id IS NOT NULL;
CREATE INDEX idx_pb_prompts_type ON public.pb_prompts(prompt_type);
CREATE INDEX idx_pb_prompts_favorites ON public.pb_prompts(user_id) WHERE is_favorite = true;

ALTER TABLE public.pb_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prompts"
  ON public.pb_prompts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_pb_prompts_updated_at
  BEFORE UPDATE ON public.pb_prompts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- Tags
-- =====================================================================
CREATE TABLE public.pb_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text CHECK (category IN ('quality','style','negative','model','custom')),
  color text,
  icon text,
  inject_text text,
  inject_position text DEFAULT 'append' NOT NULL CHECK (inject_position IN ('append','prepend','replace')),
  weight_modifier numeric,
  is_global boolean DEFAULT false NOT NULL,
  collection_id uuid REFERENCES public.pb_collections(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_pb_tags_user ON public.pb_tags(user_id);
CREATE UNIQUE INDEX idx_pb_tags_unique_name ON public.pb_tags(user_id, name);

ALTER TABLE public.pb_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags"
  ON public.pb_tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_pb_tags_updated_at
  BEFORE UPDATE ON public.pb_tags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- Prompt-Tag Junction
-- =====================================================================
CREATE TABLE public.pb_prompt_tags (
  prompt_id uuid NOT NULL REFERENCES public.pb_prompts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.pb_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (prompt_id, tag_id)
);

ALTER TABLE public.pb_prompt_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prompt tags"
  ON public.pb_prompt_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.pb_prompts WHERE id = prompt_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pb_prompts WHERE id = prompt_id AND user_id = auth.uid())
  );

-- =====================================================================
-- Prompt Versions (history)
-- =====================================================================
CREATE TABLE public.pb_prompt_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id uuid NOT NULL REFERENCES public.pb_prompts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  negative_content text,
  system_prompt text,
  change_summary text,
  diff_data jsonb,
  context_config jsonb DEFAULT '{}' NOT NULL,
  few_shot_examples jsonb DEFAULT '[]' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_pb_versions_prompt ON public.pb_prompt_versions(prompt_id, version);

ALTER TABLE public.pb_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompt versions"
  ON public.pb_prompt_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt versions"
  ON public.pb_prompt_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- Templates (shared/community prompts)
-- =====================================================================
CREATE TABLE public.pb_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  content text NOT NULL,
  negative_content text,
  system_prompt text,
  prompt_type text DEFAULT 'general' NOT NULL CHECK (prompt_type IN ('general','txt2img','img2img','chat','chain','few_shot','code','writing','analysis')),
  variables jsonb DEFAULT '[]' NOT NULL,
  context_config jsonb DEFAULT '{}' NOT NULL,
  few_shot_examples jsonb DEFAULT '[]' NOT NULL,
  chain_steps jsonb DEFAULT '[]' NOT NULL,
  guardian_id text,
  element text,
  is_public boolean DEFAULT false NOT NULL,
  use_count integer DEFAULT 0 NOT NULL,
  tags text[] DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_pb_templates_public ON public.pb_templates(category) WHERE is_public = true;
CREATE INDEX idx_pb_templates_user ON public.pb_templates(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.pb_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public templates"
  ON public.pb_templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can manage own templates"
  ON public.pb_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_pb_templates_updated_at
  BEFORE UPDATE ON public.pb_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- Function: Update collection prompt count
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_collection_prompt_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.collection_id IS NOT NULL THEN
    UPDATE public.pb_collections SET prompt_count = prompt_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' AND OLD.collection_id IS NOT NULL THEN
    UPDATE public.pb_collections SET prompt_count = prompt_count - 1 WHERE id = OLD.collection_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
      IF OLD.collection_id IS NOT NULL THEN
        UPDATE public.pb_collections SET prompt_count = prompt_count - 1 WHERE id = OLD.collection_id;
      END IF;
      IF NEW.collection_id IS NOT NULL THEN
        UPDATE public.pb_collections SET prompt_count = prompt_count + 1 WHERE id = NEW.collection_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_collection_prompt_count
  AFTER INSERT OR UPDATE OR DELETE ON public.pb_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_collection_prompt_count();

-- Comments
COMMENT ON TABLE public.pb_collections IS 'Prompt Books collections — user-organized folders for prompt management';
COMMENT ON TABLE public.pb_prompts IS 'Individual prompts with versioning, tagging, and chain support';
COMMENT ON TABLE public.pb_tags IS 'Reusable tags with inject behavior for prompt composition';
COMMENT ON TABLE public.pb_prompt_tags IS 'Junction table linking prompts to tags';
COMMENT ON TABLE public.pb_prompt_versions IS 'Version history for prompts with diff tracking';
COMMENT ON TABLE public.pb_templates IS 'Community and personal prompt templates';
