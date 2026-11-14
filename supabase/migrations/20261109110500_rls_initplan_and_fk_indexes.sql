-- Row-level security performance: 64 policies on public tables called auth.uid(),
-- auth.jwt() or auth.role() bare, so Postgres re-evaluated the call for every row
-- (Supabase advisor 0003 auth_rls_initplan). Wrapping it in (select ...) makes it an
-- initplan that runs once per statement. Who can read or write what is unchanged:
-- each expression is the live definition from pg_policies on 2026-11-09 with only the
-- call wrapped. The four policies 20261109110200/110300 redefine are left out so this
-- migration cannot undo them.

alter policy reviews_insert on public.agent_reviews with check (((select auth.uid()) = user_id));
alter policy reviews_update on public.agent_reviews using (((select auth.uid()) = user_id));
alter policy "Users can view own analytics" on public.analytics_events using (((select auth.uid()) = user_id));
alter policy "Authors can manage chapters" on public.book_chapters using (((select auth.uid()) IN ( SELECT book_authors.user_id
   FROM book_authors
  WHERE (book_authors.book_id = book_chapters.book_id))));
alter policy "Authors can update their book covers" on public.book_covers using (((select auth.uid()) IN ( SELECT book_authors.user_id
   FROM book_authors
  WHERE (book_authors.book_id = book_covers.book_id))));
alter policy "Authors can upload covers for their books" on public.book_covers with check (((select auth.uid()) IN ( SELECT book_authors.user_id
   FROM book_authors
  WHERE (book_authors.book_id = book_covers.book_id))));
alter policy "Users can delete their own ratings" on public.book_ratings using (((select auth.uid()) = user_id));
alter policy "Users can rate books (not their own)" on public.book_ratings with check ((((select auth.uid()) = user_id) AND (NOT ((select auth.uid()) IN ( SELECT book_authors.user_id
   FROM book_authors
  WHERE (book_authors.book_id = book_ratings.book_id))))));
alter policy "Authors can insert their own books" on public.books with check (((select auth.uid()) IS NOT NULL));
alter policy "Authors can update their own books" on public.books using (((select auth.uid()) IN ( SELECT book_authors.user_id
   FROM book_authors
  WHERE ((book_authors.book_id = books.id) AND (book_authors.role = ANY (ARRAY['creator'::text, 'co_author'::text, 'co_creator'::text, 'editor'::text]))))));
alter policy "Users create notes" on public.chapter_notes with check (((select auth.uid()) = user_id));
alter policy "Users delete own notes" on public.chapter_notes using (((select auth.uid()) = user_id));
alter policy "Users manage own notes" on public.chapter_notes using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users read own notes" on public.chapter_notes using (((select auth.uid()) = user_id));
alter policy "Users manage own reactions" on public.chapter_reactions with check (((select auth.uid()) = user_id));
alter policy "Users remove own reactions" on public.chapter_reactions using (((select auth.uid()) = user_id));
alter policy "Users can delete their own chat projects" on public.chat_projects using (((select auth.uid()) = user_id));
alter policy "Users can insert their own chat projects" on public.chat_projects with check (((select auth.uid()) = user_id));
alter policy "Users can update their own chat projects" on public.chat_projects using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can view their own chat projects" on public.chat_projects using (((select auth.uid()) = user_id));
alter policy creators_insert on public.creators with check (((select auth.uid()) = user_id));
alter policy creators_update on public.creators using (((select auth.uid()) = user_id));
alter policy "Users read own transactions" on public.credit_transactions using (((select auth.uid()) = user_id));
alter policy credits_insert on public.credits with check (((select auth.uid()) = user_id));
alter policy credits_select on public.credits using (((select auth.uid()) = user_id));
alter policy credits_update on public.credits using (((select auth.uid()) = user_id));
alter policy deployments_insert on public.deployments with check (((select auth.uid()) = deployer_id));
alter policy deployments_select on public.deployments using ((((select auth.uid()) = deployer_id) OR (platform_id IN ( SELECT platforms.id
   FROM platforms
  WHERE (platforms.owner_id = (select auth.uid()))))));
alter policy deployments_update on public.deployments using ((((select auth.uid()) = deployer_id) OR (platform_id IN ( SELECT platforms.id
   FROM platforms
  WHERE (platforms.owner_id = (select auth.uid()))))));
alter policy "Service role manages leaderboard" on public.leaderboard_cache using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy agents_delete on public.marketplace_agents using (((select auth.uid()) = creator_id));
alter policy agents_insert on public.marketplace_agents with check (((select auth.uid()) = creator_id));
alter policy agents_update on public.marketplace_agents using (((select auth.uid()) = creator_id));
alter policy "Users can manage their own reactions" on public.message_reactions using ((((select auth.uid()) = user_id) OR (user_id IS NULL))) with check ((((select auth.uid()) = user_id) OR (user_id IS NULL)));
alter policy platforms_delete on public.platforms using (((select auth.uid()) = owner_id));
alter policy platforms_insert on public.platforms with check (((select auth.uid()) = owner_id));
alter policy platforms_update on public.platforms using (((select auth.uid()) = owner_id));
alter policy "Users can view own doc content" on public.project_doc_content using ((doc_id IN ( SELECT project_docs.id
   FROM project_docs
  WHERE (project_docs.user_id = (select auth.uid())))));
alter policy "Users can view own doc versions" on public.project_doc_versions using ((doc_id IN ( SELECT project_docs.id
   FROM project_docs
  WHERE (project_docs.user_id = (select auth.uid())))));
alter policy "Users can delete own docs" on public.project_docs using (((select auth.uid()) = user_id));
alter policy "Users can insert own docs" on public.project_docs with check (((select auth.uid()) = user_id));
alter policy "Users can update own docs" on public.project_docs using (((select auth.uid()) = user_id));
alter policy "Users can view own docs" on public.project_docs using (((select auth.uid()) = user_id));
alter policy revenue_select on public.revenue_events using ((((select auth.uid()) = creator_id) OR ((select auth.uid()) = affiliate_id) OR (platform_id IN ( SELECT platforms.id
   FROM platforms
  WHERE (platforms.owner_id = (select auth.uid()))))));
alter policy skills_delete on public.skill_registry using (((select auth.uid()) = creator_id));
alter policy skills_insert on public.skill_registry with check (((select auth.uid()) = creator_id));
alter policy skills_update on public.skill_registry using (((select auth.uid()) = creator_id));
alter policy usage_insert on public.usage_events with check (((select auth.uid()) = user_id));
alter policy usage_select on public.usage_events using ((((select auth.uid()) = user_id) OR (deployment_id IN ( SELECT deployments.id
   FROM deployments
  WHERE (deployments.deployer_id = (select auth.uid())))) OR (platform_id IN ( SELECT platforms.id
   FROM platforms
  WHERE (platforms.owner_id = (select auth.uid()))))));
alter policy "Users read own credits" on public.user_credits using (((select auth.uid()) = user_id));
alter policy "Users manage own progression" on public.user_progression using (((select auth.uid()) = user_id));
alter policy "Characters follow world visibility" on public.world_characters using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_characters.world_id) AND ((w.visibility = 'public'::text) OR (w.creator_id = (select auth.uid())))))));
alter policy "Creators manage own characters" on public.world_characters using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_characters.world_id) AND (w.creator_id = (select auth.uid()))))));
alter policy "Collaborators can view membership" on public.world_collaborators using ((((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_collaborators.world_id) AND (w.creator_id = (select auth.uid())))))));
alter policy "World owners manage collaborators" on public.world_collaborators using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_collaborators.world_id) AND (w.creator_id = (select auth.uid()))))));
alter policy "Creators manage own events" on public.world_events using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_events.world_id) AND (w.creator_id = (select auth.uid()))))));
alter policy "Events follow world visibility" on public.world_events using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_events.world_id) AND ((w.visibility = 'public'::text) OR (w.creator_id = (select auth.uid())))))));
alter policy "Creators manage own factions" on public.world_factions using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_factions.world_id) AND (w.creator_id = (select auth.uid()))))));
alter policy "Factions follow world visibility" on public.world_factions using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_factions.world_id) AND ((w.visibility = 'public'::text) OR (w.creator_id = (select auth.uid())))))));
alter policy "Users create own forks" on public.world_forks with check (((select auth.uid()) = forked_by));
alter policy "Creators manage own locations" on public.world_locations using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_locations.world_id) AND (w.creator_id = (select auth.uid()))))));
alter policy "Locations follow world visibility" on public.world_locations using ((EXISTS ( SELECT 1
   FROM worlds w
  WHERE ((w.id = world_locations.world_id) AND ((w.visibility = 'public'::text) OR (w.creator_id = (select auth.uid())))))));
alter policy "Users manage own stars" on public.world_stars using (((select auth.uid()) = user_id));
alter policy "Creators manage own worlds" on public.worlds using (((select auth.uid()) = creator_id));


-- Foreign keys with no covering index (advisor 0001 unindexed_foreign_keys).
create index if not exists idx_project_docs_parent_doc_id on public.project_docs (parent_doc_id);
create index if not exists idx_reader_illustration_requests_creation_id on public.reader_illustration_requests (creation_id);
create index if not exists idx_project_doc_versions_author_user_id on public.project_doc_versions (author_user_id);
