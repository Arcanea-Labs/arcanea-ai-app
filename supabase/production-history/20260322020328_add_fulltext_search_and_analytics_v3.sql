-- Production migration 20260322020328_add_fulltext_search_and_analytics_v3 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Full-Text Search + Analytics Views (v3 - fixed types)
-- ============================================================

-- ---- Full-Text Search on Creations ----
ALTER TABLE public.creations ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.creations_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creations_search_vector ON public.creations;
CREATE TRIGGER trg_creations_search_vector
  BEFORE INSERT OR UPDATE OF title, description, tags ON public.creations
  FOR EACH ROW EXECUTE FUNCTION public.creations_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_creations_search_vector ON public.creations USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_creations_title_trgm ON public.creations USING gin(title extensions.gin_trgm_ops);

UPDATE public.creations SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL;

-- ---- Full-Text Search on Luminors ----
-- personality is text[], tags is text[] — use array_to_string
ALTER TABLE public.luminors ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.luminors_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.wisdom, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.personality, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_luminors_search_vector ON public.luminors;
CREATE TRIGGER trg_luminors_search_vector
  BEFORE INSERT OR UPDATE OF name, tagline, wisdom, personality, tags ON public.luminors
  FOR EACH ROW EXECUTE FUNCTION public.luminors_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_luminors_search_vector ON public.luminors USING gin(search_vector);

UPDATE public.luminors SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(tagline, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(wisdom, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(personality, ' '), '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL;

-- ---- Search RPC: Full-text search creations ----
CREATE OR REPLACE FUNCTION public.search_creations(
  search_query text, result_limit int DEFAULT 20, result_offset int DEFAULT 0
)
RETURNS TABLE(id uuid, title text, description text, type text, user_id uuid, like_count int, view_count int, rank real)
LANGUAGE plpgsql SET search_path = public STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.title, c.description, c.type::text, c.user_id, c.like_count, c.view_count,
    ts_rank(c.search_vector, websearch_to_tsquery('english', search_query))::real as rank
  FROM public.creations c
  WHERE c.search_vector @@ websearch_to_tsquery('english', search_query)
    AND c.status = 'published' AND c.visibility = 'public'
  ORDER BY rank DESC, c.created_at DESC
  LIMIT result_limit OFFSET result_offset;
END;
$$;

-- ---- Search RPC: Fuzzy/autocomplete ----
CREATE OR REPLACE FUNCTION public.fuzzy_search_creations(
  search_query text, similarity_threshold real DEFAULT 0.3, result_limit int DEFAULT 10
)
RETURNS TABLE(id uuid, title text, type text, similarity real)
LANGUAGE plpgsql SET search_path = public STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.title, c.type::text,
    extensions.similarity(c.title, search_query)::real
  FROM public.creations c
  WHERE extensions.similarity(c.title, search_query) > similarity_threshold
    AND c.status = 'published' AND c.visibility = 'public'
  ORDER BY extensions.similarity(c.title, search_query) DESC
  LIMIT result_limit;
END;
$$;

-- ---- Analytics: Platform Stats ----
CREATE OR REPLACE VIEW public.platform_stats AS
SELECT
  (SELECT count(*) FROM public.profiles) as total_users,
  (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days') as new_users_7d,
  (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days') as new_users_30d,
  (SELECT count(*) FROM public.creations WHERE status = 'published') as total_creations,
  (SELECT count(*) FROM public.creations WHERE status = 'published' AND created_at > now() - interval '7 days') as new_creations_7d,
  (SELECT count(*) FROM public.chat_sessions) as total_chat_sessions,
  (SELECT count(*) FROM public.chat_messages) as total_chat_messages,
  (SELECT count(*) FROM public.luminors WHERE published = true) as total_luminors,
  (SELECT count(*) FROM public.luminor_councils) as total_councils,
  (SELECT COALESCE(sum(like_count), 0) FROM public.creations) as total_likes,
  (SELECT COALESCE(sum(view_count), 0) FROM public.creations) as total_views;

-- ---- Analytics: User Engagement ----
CREATE OR REPLACE VIEW public.user_engagement AS
SELECT
  p.id as user_id, p.display_name, p.magic_rank, p.gates_open, p.xp, p.level, p.streak_days,
  (SELECT count(*) FROM public.creations c WHERE c.user_id = p.id AND c.status = 'published') as creation_count,
  (SELECT count(*) FROM public.chat_sessions cs WHERE cs.user_id = p.id) as chat_session_count,
  (SELECT count(*) FROM public.likes l WHERE l.user_id = p.id) as likes_given,
  (SELECT COALESCE(sum(c2.like_count), 0) FROM public.creations c2 WHERE c2.user_id = p.id) as likes_received,
  (SELECT COALESCE(sum(c3.view_count), 0) FROM public.creations c3 WHERE c3.user_id = p.id) as views_received,
  p.created_at as joined_at, p.updated_at as last_active
FROM public.profiles p;

-- ---- Analytics: Trending Creations ----
CREATE OR REPLACE VIEW public.trending_creations AS
SELECT c.id, c.title, c.type, c.user_id, p.display_name as creator_name,
  c.like_count, c.view_count, c.element, c.gate, c.guardian, c.created_at,
  CASE WHEN (c.like_count + c.view_count) > 0 THEN
    (c.like_count::numeric + 1.9208) / (c.like_count + c.view_count + 3.8416)
  ELSE 0 END as trending_score
FROM public.creations c
LEFT JOIN public.profiles p ON p.id = c.user_id
WHERE c.status = 'published' AND c.visibility = 'public'
  AND c.created_at > now() - interval '30 days'
ORDER BY trending_score DESC;

-- ---- Analytics: Element Distribution ----
CREATE OR REPLACE VIEW public.element_distribution AS
SELECT element, count(*) as creation_count,
  COALESCE(sum(like_count), 0) as total_likes,
  COALESCE(sum(view_count), 0) as total_views,
  round(count(*)::numeric / NULLIF((SELECT count(*) FROM public.creations WHERE status = 'published'), 0) * 100, 1) as percentage
FROM public.creations
WHERE status = 'published' AND element IS NOT NULL
GROUP BY element ORDER BY creation_count DESC;
