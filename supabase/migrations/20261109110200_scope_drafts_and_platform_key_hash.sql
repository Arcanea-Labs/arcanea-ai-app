-- Three live access leaks found while mirroring production history
-- (verified against pg_policies and column grants on 2026-11-08).

-- 1. Any signed-in user could read every unpublished chapter and every
--    non-active cover ("... OR auth.uid() IS NOT NULL"). Scope drafts to the
--    book's authors. Covers also stay visible to whoever generated them,
--    because app/api/books/covers counts a user's own covers for its
--    10-per-day rate limit.

drop policy if exists "Published chapters are publicly readable" on public.book_chapters;
create policy "Published chapters are publicly readable" on public.book_chapters
  for select
  using (
    status = 'published'
    or exists (
      select 1 from public.book_authors ba
      where ba.book_id = book_chapters.book_id
        and ba.user_id = (select auth.uid())
    )
  );

drop policy if exists "Active book covers are publicly readable" on public.book_covers;
create policy "Active book covers are publicly readable" on public.book_covers
  for select
  using (
    status = 'active'
    or generated_by = (select auth.uid())
    or exists (
      select 1 from public.book_authors ba
      where ba.book_id = book_covers.book_id
        and ba.user_id = (select auth.uid())
    )
  );

-- 2. platforms.api_key_hash was selectable by anon and authenticated on every
--    active row. The app only ever selects platforms.id (lib/registry/queries.ts).
--    Column grants cannot narrow a table-level grant, so swap the table-level
--    SELECT for explicit columns.

revoke select on public.platforms from anon, authenticated;
grant select (id, name, owner_id, description, agent_count, deployment_count, is_active, created_at, updated_at)
  on public.platforms to anon, authenticated;
