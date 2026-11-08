-- Production migration 20260227004733_arcanea_foundation on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- ARCANEA FOUNDATION MIGRATION
-- Core tables, RLS, triggers, storage buckets, indexes
-- ============================================================

-- 0. CLEANUP: Drop rogue foreign table flagged by security advisor
DROP FOREIGN TABLE IF EXISTS public.c;
DROP SERVER IF EXISTS x_server CASCADE;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. HELPER FUNCTIONS
-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  magic_rank TEXT NOT NULL DEFAULT 'Apprentice' CHECK (magic_rank IN ('Apprentice', 'Mage', 'Master', 'Archmage', 'Luminor')),
  gates_open INTEGER NOT NULL DEFAULT 0 CHECK (gates_open >= 0 AND gates_open <= 10),
  active_gate TEXT DEFAULT 'Foundation' CHECK (active_gate IN ('Foundation', 'Flow', 'Fire', 'Heart', 'Voice', 'Sight', 'Crown', 'Shift', 'Unity', 'Source')),
  guardian TEXT DEFAULT 'Lyssandria' CHECK (guardian IN ('Lyssandria', 'Leyla', 'Draconia', 'Maylinn', 'Alera', 'Lyria', 'Aiyami', 'Elara', 'Ino', 'Shinkami')),
  academy_house TEXT CHECK (academy_house IN ('Lumina', 'Nero', 'Pyros', 'Aqualis', 'Terra', 'Ventus', 'Synthesis')),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles with Arcanea progression (Gates, Guardians, Ranks)';

-- 4. CREATIONS TABLE
CREATE TABLE public.creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  content JSONB DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'code', 'mixed')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  element TEXT CHECK (element IN ('Fire', 'Water', 'Earth', 'Wind', 'Void', 'Spirit')),
  gate TEXT CHECK (gate IN ('Foundation', 'Flow', 'Fire', 'Heart', 'Voice', 'Sight', 'Crown', 'Shift', 'Unity', 'Source')),
  guardian TEXT CHECK (guardian IN ('Lyssandria', 'Leyla', 'Draconia', 'Maylinn', 'Alera', 'Lyria', 'Aiyami', 'Elara', 'Ino', 'Shinkami')),
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  ai_model TEXT,
  ai_prompt TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.creations IS 'User-generated content: text, images, videos, code, mixed media';

-- 5. COLLECTIONS TABLE
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.collections IS 'Curated sets of creations organized by users';

-- 6. COLLECTION_ITEMS (junction table)
CREATE TABLE public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, creation_id)
);

-- 7. LIKES TABLE
CREATE TABLE public.likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, creation_id)
);

-- 8. FOLLOWS TABLE
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 9. ACTIVITY LOG
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_log IS 'User activity for XP, streaks, and analytics';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_creations_updated_at
  BEFORE UPDATE ON public.creations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_creations_user_id ON public.creations(user_id);
CREATE INDEX idx_creations_status ON public.creations(status) WHERE status = 'published';
CREATE INDEX idx_creations_visibility ON public.creations(visibility) WHERE visibility = 'public';
CREATE INDEX idx_creations_type ON public.creations(type);
CREATE INDEX idx_creations_created_at ON public.creations(created_at DESC);
CREATE INDEX idx_creations_tags ON public.creations USING GIN(tags);

CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collection_items_collection ON public.collection_items(collection_id);
CREATE INDEX idx_collection_items_creation ON public.collection_items(creation_id);

CREATE INDEX idx_likes_creation ON public.likes(creation_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_activity_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- CREATIONS
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public creations are viewable by everyone"
  ON public.creations FOR SELECT
  USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create own creations"
  ON public.creations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creations"
  ON public.creations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own creations"
  ON public.creations FOR DELETE
  USING (auth.uid() = user_id);

-- COLLECTIONS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public collections are viewable by everyone"
  ON public.collections FOR SELECT
  USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- COLLECTION_ITEMS
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection items viewable if collection is viewable"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND (c.visibility = 'public' OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage items in own collections"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove items from own collections"
  ON public.collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

-- LIKES
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- FOLLOWS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ACTIVITY LOG
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('creations', 'creations', false, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'application/pdf']),
  ('thumbnails', 'thumbnails', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- STORAGE POLICIES: avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- STORAGE POLICIES: creations (private bucket)
CREATE POLICY "Users can view own creations files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own creation files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own creation files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own creation files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'creations' AND (storage.foldername(name))[1] = auth.uid()::text);

-- STORAGE POLICIES: thumbnails (public bucket)
CREATE POLICY "Thumbnails are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload own thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own thumbnails"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
