-- Clients could write columns that only the server should set. Every case
-- below was verified live on 2026-11-08 (column privileges + pg_policies),
-- and every client write path in apps/web was checked so none breaks.
--
-- Column grants cannot narrow a table-level grant, so each block revokes the
-- table-level privilege and grants back the columns clients legitimately set.

-- 1. profiles: signed-in users could set their own xp, level, streak_days,
--    subscription_tier, subscription_ends_at and stripe_customer_id.
--    Kept writable: what settings, onboarding and the academy quizzes send
--    (gates_open, magic_rank, active_gate, guardian are self-assessed by design).
--    unlock_gate() is SECURITY DEFINER and the Stripe webhook uses the service
--    role, so neither is affected.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, bio, avatar_url, academy_house, active_gate, guardian,
              gates_open, magic_rank, metadata, last_active_at, updated_at)
  on public.profiles to authenticated;

-- 2. book_ratings: raters could clear is_hidden and reported_count on their own
--    review (self-unhiding a moderated review), and the UPDATE policy had no
--    WITH CHECK, so a rating could be moved to another user.
revoke insert, update on public.book_ratings from anon, authenticated;
grant insert (book_id, user_id, stars, review) on public.book_ratings to authenticated;
-- book_id and user_id stay updatable because app/api/books/[slug]/ratings
-- upserts {book_id, user_id, stars, review} and PostgREST sets every sent
-- column on conflict. WITH CHECK pins the owner and repeats the insert
-- policy's "not your own book" rule so an update cannot dodge it.
grant update (book_id, user_id, stars, review, updated_at) on public.book_ratings to authenticated;

drop policy if exists "Users can update their own ratings" on public.book_ratings;
create policy "Users can update their own ratings" on public.book_ratings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.book_authors ba
      where ba.book_id = book_ratings.book_id
        and ba.user_id = (select auth.uid())
    )
  );

-- 3. creators: owners could set total_earned, attribution_score, agent_count
--    and skill_count on insert or update. Table is empty today.
revoke insert, update on public.creators from anon, authenticated;
grant insert (user_id, display_name, wallet_address, bio, avatar_url, links)
  on public.creators to authenticated;
grant update (display_name, wallet_address, bio, avatar_url, links, updated_at)
  on public.creators to authenticated;

-- 4. world_creations: the ALL policy only checked creator_id, so anyone could
--    attach a creation to someone else's world. Writes now also need write
--    access to the world (owner, or editor/admin collaborator).
drop policy if exists "Creators manage own creations" on public.world_creations;
create policy "Creators manage own creations" on public.world_creations
  for all to authenticated
  using ((select auth.uid()) = creator_id)
  with check (
    (select auth.uid()) = creator_id
    and exists (
      select 1 from public.worlds w
      where w.id = world_creations.world_id
        and (
          w.creator_id = (select auth.uid())
          or exists (
            select 1 from public.world_collaborators wc
            where wc.world_id = w.id
              and wc.user_id = (select auth.uid())
              and wc.role in ('editor', 'admin')
          )
        )
    )
  );
