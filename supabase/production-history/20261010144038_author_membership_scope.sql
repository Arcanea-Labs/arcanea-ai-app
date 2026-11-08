-- Production migration 20261010144038_author_membership_scope on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- The previous unaliased self-query compared its own book_id to itself.
-- A creator's invitation authority must be limited to the target book.
alter table public.book_authors enable row level security;
drop policy if exists "Authors can add co-authors to their books"
  on public.book_authors;
create policy "Authors can add co-authors to their books"
  on public.book_authors for insert to authenticated
  with check (
    exists (
      select 1 from public.book_authors as existing_creator
      where existing_creator.book_id = book_authors.book_id
        and existing_creator.user_id = (select auth.uid())
        and existing_creator.role = 'creator'
    )
  );
