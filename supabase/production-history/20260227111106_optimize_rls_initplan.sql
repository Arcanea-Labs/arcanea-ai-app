-- Production migration 20260227111106_optimize_rls_initplan on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Optimize all RLS policies: wrap auth.uid() in (select ...) to prevent per-row re-evaluation

-- PROFILES
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- CREATIONS
DROP POLICY IF EXISTS "Public creations are viewable by everyone" ON public.creations;
CREATE POLICY "Public creations are viewable by everyone"
  ON public.creations FOR SELECT
  USING (visibility = 'public' OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own creations" ON public.creations;
CREATE POLICY "Users can create own creations"
  ON public.creations FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own creations" ON public.creations;
CREATE POLICY "Users can update own creations"
  ON public.creations FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own creations" ON public.creations;
CREATE POLICY "Users can delete own creations"
  ON public.creations FOR DELETE
  USING ((select auth.uid()) = user_id);

-- COLLECTIONS
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON public.collections;
CREATE POLICY "Public collections are viewable by everyone"
  ON public.collections FOR SELECT
  USING (visibility = 'public' OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own collections" ON public.collections;
CREATE POLICY "Users can create own collections"
  ON public.collections FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own collections" ON public.collections;
CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own collections" ON public.collections;
CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING ((select auth.uid()) = user_id);

-- COLLECTION_ITEMS
DROP POLICY IF EXISTS "Collection items viewable if collection is viewable" ON public.collection_items;
CREATE POLICY "Collection items viewable if collection is viewable"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND (c.visibility = 'public' OR c.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can manage items in own collections" ON public.collection_items;
CREATE POLICY "Users can manage items in own collections"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can remove items from own collections" ON public.collection_items;
CREATE POLICY "Users can remove items from own collections"
  ON public.collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND c.user_id = (select auth.uid())
    )
  );

-- LIKES
DROP POLICY IF EXISTS "Users can like" ON public.likes;
CREATE POLICY "Users can like"
  ON public.likes FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON public.likes;
CREATE POLICY "Users can unlike"
  ON public.likes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- FOLLOWS
DROP POLICY IF EXISTS "Users can follow" ON public.follows;
CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING ((select auth.uid()) = follower_id);

-- ACTIVITY LOG
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own activity" ON public.activity_log;
CREATE POLICY "Users can create own activity"
  ON public.activity_log FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
