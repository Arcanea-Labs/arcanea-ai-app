-- Disposable PostgreSQL fixture only. Never run against the product database.
-- Rebuilds the production grants and policies found on 2026-11-08 (table-level
-- grants to anon/authenticated, the vulnerable policies), applies the
-- 20261108 fix migrations, then proves each hole is closed and each
-- legitimate client write still works.
\set ON_ERROR_STOP on
\if :{?trust_disposable}
\else
\echo 'trust_disposable admission is required'
\quit 2
\endif
do $$ begin
  if to_regnamespace('auth') is not null or to_regclass('public.profiles') is not null then
    raise exception 'Trust fixture requires empty disposable PostgreSQL';
  end if;
end $$;

create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- ── Production shape (only the columns the migrations and checks touch) ──
create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null, read boolean not null default false);
create table public.profiles(
  id uuid primary key, display_name text, bio text, avatar_url text, academy_house text, active_gate text,
  guardian text, gates_open int default 0, magic_rank text, metadata jsonb, last_active_at timestamptz,
  updated_at timestamptz, xp int default 0, level int default 1, streak_days int default 0,
  subscription_tier text, subscription_ends_at timestamptz, stripe_customer_id text);
create table public.books(
  id uuid primary key, slug text, title text, subtitle text, description text, tagline text, tier text default 'community',
  status text, cover_id uuid, tags text[], genre text, content_rating text, license text, total_word_count int,
  chapter_count int, star_average numeric(3,2), rating_count int default 0, view_count int default 0,
  guardian_score int, ai_metadata jsonb, acknowledgments text, created_at timestamptz default now(),
  updated_at timestamptz, published_at timestamptz);
create table public.book_authors(book_id uuid, user_id uuid, role text, primary key(book_id, user_id));
create table public.book_chapters(id uuid primary key default gen_random_uuid(), book_id uuid, status text);
create table public.book_covers(id uuid primary key default gen_random_uuid(), book_id uuid, status text, generated_by uuid);
create table public.book_ratings(
  id uuid primary key default gen_random_uuid(), book_id uuid, user_id uuid, stars int, review text,
  is_hidden boolean not null default false, reported_count int not null default 0,
  created_at timestamptz default now(), updated_at timestamptz, unique(book_id, user_id));
create table public.creators(
  user_id uuid primary key, display_name text, wallet_address text, attribution_score numeric default 0,
  total_earned numeric default 0, agent_count int default 0, skill_count int default 0, bio text,
  avatar_url text, links jsonb, created_at timestamptz default now(), updated_at timestamptz);
create table public.worlds(id uuid primary key, creator_id uuid, visibility text);
create table public.world_collaborators(world_id uuid, user_id uuid, role text, primary key(world_id, user_id));
create table public.world_creations(id uuid primary key default gen_random_uuid(), world_id uuid, creator_id uuid, title text);
create table public.message_reactions(id uuid primary key default gen_random_uuid(), message_id text not null, user_id uuid, reaction text, unique(user_id, message_id));
create table public.platforms(
  id uuid primary key default gen_random_uuid(), name text, owner_id uuid, description text, api_key_hash text not null,
  allowed_origins text[], fee_override numeric, agent_count int default 0, deployment_count int default 0,
  is_active boolean default true, created_at timestamptz default now(), updated_at timestamptz);

do $$ declare t text; begin
  foreach t in array array['notifications','profiles','books','book_authors','book_chapters','book_covers',
                           'book_ratings','creators','worlds','world_collaborators','world_creations','platforms','message_reactions'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
-- Supabase's default: every table-level privilege to the API roles.
grant all on all tables in schema public to anon, authenticated;

create function public.get_unread_notification_count() returns int language plpgsql stable security definer
  set search_path = public, pg_temp as $$
declare cnt int; begin
  select count(*) into cnt from public.notifications where user_id = auth.uid() and read = false;
  return cnt;
end $$;
-- The 2026-08-10 lockdown state.
revoke execute on function public.get_unread_notification_count() from public, anon, authenticated;

create function public.update_book_rating_stats() returns trigger language plpgsql
  set search_path = public, pg_temp as $$
begin
  update public.books set
    star_average = (select avg(stars)::numeric(3,2) from public.book_ratings where book_id = coalesce(new.book_id, old.book_id) and is_hidden = false),
    rating_count = (select count(*) from public.book_ratings where book_id = coalesce(new.book_id, old.book_id) and is_hidden = false)
  where id = coalesce(new.book_id, old.book_id);
  return coalesce(new, old);
end $$;
create trigger trg_book_ratings_update_stats after insert or delete or update on public.book_ratings
  for each row execute function public.update_book_rating_stats();

-- Production policies as found.
create policy "Users can view own notifications" on public.notifications for select using (user_id = (select auth.uid()));
create policy "Public profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Books readable" on public.books for select using (true);
create policy "Authors can update their own books" on public.books for update
  using (auth.uid() in (select user_id from public.book_authors where book_id = books.id and role in ('creator','co_author','co_creator','editor')));
create policy "Authors readable" on public.book_authors for select using (true);
create policy "Published chapters are publicly readable" on public.book_chapters for select using (status = 'published' or auth.uid() is not null);
create policy "Active book covers are publicly readable" on public.book_covers for select using (status = 'active' or auth.uid() is not null);
create policy "Ratings readable" on public.book_ratings for select using (true);
create policy "Users can rate books (not their own)" on public.book_ratings for insert
  with check (auth.uid() = user_id and not (auth.uid() in (select user_id from public.book_authors where book_id = book_ratings.book_id)));
create policy "Users can update their own ratings" on public.book_ratings for update using (auth.uid() = user_id);
create policy creators_select on public.creators for select using (true);
create policy creators_insert on public.creators for insert with check (auth.uid() = user_id);
create policy creators_update on public.creators for update using (auth.uid() = user_id);
create policy worlds_select on public.worlds for select using (true);
create policy collab_select on public.world_collaborators for select using (true);
create policy "Creators manage own creations" on public.world_creations for all using (auth.uid() = creator_id);
create policy platforms_select on public.platforms for select using (is_active = true);
create policy "Users can manage their own reactions" on public.message_reactions
  using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);

-- ── Seed ──
-- A authors book_a and owns world_a. B authors book_b, owns world_b, edits world_a.
insert into auth.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.profiles(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.notifications(user_id, read) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false), ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
insert into public.books(id, title) values ('a0000000-0000-4000-8000-00000000000a', 'Book A'), ('b0000000-0000-4000-8000-00000000000b', 'Book B');
insert into public.book_authors values
  ('a0000000-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'creator'),
  ('b0000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'creator');
insert into public.book_chapters(book_id, status) values ('a0000000-0000-4000-8000-00000000000a', 'published'), ('a0000000-0000-4000-8000-00000000000a', 'draft');
insert into public.book_covers(book_id, status, generated_by) values
  ('a0000000-0000-4000-8000-00000000000a', 'active', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('a0000000-0000-4000-8000-00000000000a', 'draft', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('a0000000-0000-4000-8000-00000000000a', 'draft', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.worlds values ('a1000000-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'public'),
                                 ('b1000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'public');
insert into public.world_collaborators values ('a1000000-0000-4000-8000-00000000000a', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'editor');
insert into public.message_reactions(message_id, user_id, reaction) values ('m-anon-seed', null, 'up');
insert into public.platforms(name, owner_id, api_key_hash) values ('P', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'hash-secret');

-- ── The fixes under test ──
\ir ../migrations/20261108180000_fix_unread_notification_count.sql
\ir ../migrations/20261108180100_drop_duplicate_indexes.sql
\ir ../migrations/20261108180200_scope_drafts_and_platform_key_hash.sql
\ir ../migrations/20261108180300_lock_client_trust_columns.sql
\ir ../migrations/20261108180400_fix_book_rating_stats_and_lock_book_scores.sql
\ir ../migrations/20261108180600_message_reactions_owner_only.sql

-- ── As user A ──
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$ begin
  if public.get_unread_notification_count() <> 1 then raise exception 'Badge count wrong or blocked'; end if;

  update public.profiles set display_name = 'A', bio = 'b', gates_open = 3, magic_rank = 'mage', active_gate = 'Fire', guardian = 'Draconia'
    where id = auth.uid();
  if not found then raise exception 'Legitimate profile edit blocked'; end if;

  begin update public.profiles set xp = 999999 where id = auth.uid(); raise exception 'xp self-grant accepted';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set subscription_tier = 'luminor' where id = auth.uid(); raise exception 'plan self-grant accepted';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set stripe_customer_id = 'cus_x' where id = auth.uid(); raise exception 'stripe id write accepted';
  exception when insufficient_privilege then null; end;

  if (select count(*) from public.book_chapters) <> 2 then raise exception 'Author lost own draft chapter'; end if;
  if (select count(*) from public.book_covers) <> 3 then raise exception 'Author lost own draft covers'; end if;

  update public.books set title = 'Book A revised' where id = 'a0000000-0000-4000-8000-00000000000a';
  if not found then raise exception 'Author title edit blocked'; end if;
  begin update public.books set tier = 'premium' where id = 'a0000000-0000-4000-8000-00000000000a'; raise exception 'Author set own tier';
  exception when insufficient_privilege then null; end;
  begin update public.books set star_average = 5 where id = 'a0000000-0000-4000-8000-00000000000a'; raise exception 'Author set own rating';
  exception when insufficient_privilege then null; end;

  insert into public.creators(user_id, display_name) values (auth.uid(), 'A');
  begin insert into public.creators(user_id, total_earned) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1e6); raise exception 'Earnings insert accepted';
  exception when insufficient_privilege then null; end;
  begin update public.creators set total_earned = 1e6 where user_id = auth.uid(); raise exception 'Earnings update accepted';
  exception when insufficient_privilege then null; end;
  update public.creators set bio = 'hello' where user_id = auth.uid();
  if not found then raise exception 'Creator bio edit blocked'; end if;

  insert into public.world_creations(world_id, creator_id, title) values ('a1000000-0000-4000-8000-00000000000a', auth.uid(), 'Own world');
  begin insert into public.world_creations(world_id, creator_id, title) values ('b1000000-0000-4000-8000-00000000000b', auth.uid(), 'Squat');
    raise exception 'Creation attached to a foreign world';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- ── As user B (reader of A's book, editor on A's world) ──
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ begin
  if public.get_unread_notification_count() <> 2 then raise exception 'Badge count crossed users'; end if;
  if (select count(*) from public.book_chapters) <> 1 then raise exception 'Draft chapter visible to non-author'; end if;
  if (select count(*) from public.book_covers) <> 1 then raise exception 'Draft cover visible to non-author'; end if;

  -- The ratings route upsert, exactly as PostgREST issues it.
  insert into public.book_ratings(book_id, user_id, stars, review) values ('a0000000-0000-4000-8000-00000000000a', auth.uid(), 4, 'Good')
    on conflict (book_id, user_id) do update set book_id = excluded.book_id, user_id = excluded.user_id, stars = excluded.stars, review = excluded.review;
  insert into public.book_ratings(book_id, user_id, stars, review) values ('a0000000-0000-4000-8000-00000000000a', auth.uid(), 2, 'Changed my mind')
    on conflict (book_id, user_id) do update set book_id = excluded.book_id, user_id = excluded.user_id, stars = excluded.stars, review = excluded.review;
  if (select stars from public.book_ratings where user_id = auth.uid()) <> 2 then raise exception 'Rating upsert did not update'; end if;

  begin update public.book_ratings set is_hidden = false, reported_count = 0 where user_id = auth.uid(); raise exception 'Moderation flags writable';
  exception when insufficient_privilege then null; end;
  begin update public.book_ratings set book_id = 'b0000000-0000-4000-8000-00000000000b' where user_id = auth.uid(); raise exception 'Rating moved onto own book';
  exception when insufficient_privilege then null; end;
  begin update public.book_ratings set user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' where user_id = auth.uid(); raise exception 'Rating reassigned to another user';
  exception when insufficient_privilege then null; end;

  insert into public.world_creations(world_id, creator_id, title) values ('a1000000-0000-4000-8000-00000000000a', auth.uid(), 'Editor contribution');

  insert into public.message_reactions(message_id, user_id, reaction) values ('m-1', auth.uid(), 'up');
  delete from public.message_reactions where message_id = 'm-1' and user_id = auth.uid();
  if found is false then raise exception 'Owner could not delete own reaction'; end if;
  update public.message_reactions set reaction = 'down' where user_id is null;
  delete from public.message_reactions where user_id is null;
  if (select count(*) from public.message_reactions where user_id is null and reaction = 'up') <> 1 then
    raise exception 'Anonymous reaction was changed or deleted by another user';
  end if;
end $$;
commit;

-- Rating stats now follow reader ratings (previously stuck because the trigger ran as the reader).
do $$ begin
  if (select rating_count from public.books where id = 'a0000000-0000-4000-8000-00000000000a') <> 1
     or (select star_average from public.books where id = 'a0000000-0000-4000-8000-00000000000a') <> 2.00 then
    raise exception 'Rating stats did not update from a reader rating';
  end if;
end $$;

-- ── As user C (generated a draft cover on A's book) ──
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
do $$ begin
  if (select count(*) from public.book_covers) <> 2 then raise exception 'Generator cannot see own draft cover (rate limiter breaks)'; end if;
end $$;
commit;

-- ── As anon ──
begin;
set local role anon;
do $$ begin
  if (select count(*) from public.platforms) <> 1 then raise exception 'Active platform not listable'; end if;
  begin perform api_key_hash from public.platforms; raise exception 'api_key_hash readable by anon';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set xp = 1; raise exception 'anon profile write accepted';
  exception when insufficient_privilege then null; end;
  insert into public.message_reactions(message_id, user_id, reaction) values ('m-anon', null, 'up');
  begin insert into public.message_reactions(message_id, user_id, reaction) values ('m-forged', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'up');
    raise exception 'anon forged a reaction for a user';
  exception when insufficient_privilege then null; end;
end $$;
commit;

\echo 'client trust boundaries: all checks passed'
