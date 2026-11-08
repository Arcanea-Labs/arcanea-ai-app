-- Production migration 20260329124552_fix_chapter_reaction_counts_security_invoker on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Fix security advisory: view should use SECURITY INVOKER (querying user's permissions)
-- so RLS on the underlying chapter_reactions table is respected.
DROP VIEW IF EXISTS chapter_reaction_counts;

CREATE VIEW chapter_reaction_counts
WITH (security_invoker = on)
AS
SELECT
  book_id,
  chapter_slug,
  reaction_type,
  COUNT(*) as count
FROM chapter_reactions
GROUP BY book_id, chapter_slug, reaction_type;
