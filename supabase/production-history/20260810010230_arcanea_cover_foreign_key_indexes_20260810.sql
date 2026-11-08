-- Production migration 20260810010230_arcanea_cover_foreign_key_indexes_20260810 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Every foreign key receives a covering index to protect joins and cascades.
CREATE INDEX IF NOT EXISTS agent_reviews_user_id_idx ON public.agent_reviews(user_id);
CREATE INDEX IF NOT EXISTS book_covers_approved_by_idx ON public.book_covers(approved_by);
CREATE INDEX IF NOT EXISTS book_covers_generated_by_idx ON public.book_covers(generated_by);
CREATE INDEX IF NOT EXISTS book_ratings_user_id_idx ON public.book_ratings(user_id);
CREATE INDEX IF NOT EXISTS books_cover_id_idx ON public.books(cover_id);
CREATE INDEX IF NOT EXISTS credit_transactions_world_id_idx ON public.credit_transactions(world_id);
CREATE INDEX IF NOT EXISTS marketplace_agents_creator_id_idx ON public.marketplace_agents(creator_id);
CREATE INDEX IF NOT EXISTS platforms_owner_id_idx ON public.platforms(owner_id);
CREATE INDEX IF NOT EXISTS revenue_events_affiliate_id_idx ON public.revenue_events(affiliate_id);
CREATE INDEX IF NOT EXISTS revenue_events_deployment_id_idx ON public.revenue_events(deployment_id);
CREATE INDEX IF NOT EXISTS skill_registry_agent_id_idx ON public.skill_registry(agent_id);
CREATE INDEX IF NOT EXISTS skill_registry_creator_id_idx ON public.skill_registry(creator_id);
CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON public.usage_events(user_id);
CREATE INDEX IF NOT EXISTS user_progression_world_id_idx ON public.user_progression(world_id);
CREATE INDEX IF NOT EXISTS world_characters_faction_id_idx ON public.world_characters(faction_id);
CREATE INDEX IF NOT EXISTS world_collaborators_user_id_idx ON public.world_collaborators(user_id);
CREATE INDEX IF NOT EXISTS world_events_location_id_idx ON public.world_events(location_id);
CREATE INDEX IF NOT EXISTS world_forks_forked_by_idx ON public.world_forks(forked_by);
CREATE INDEX IF NOT EXISTS world_forks_forked_world_id_idx ON public.world_forks(forked_world_id);
CREATE INDEX IF NOT EXISTS world_forks_parent_world_id_idx ON public.world_forks(parent_world_id);
CREATE INDEX IF NOT EXISTS worlds_forked_from_id_idx ON public.worlds(forked_from_id);
