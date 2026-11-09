-- "Users can manage their own reactions" allowed every command on any row whose
-- user_id IS NULL, so anyone could edit or delete every anonymous reaction.
-- apps/web/app/api/feedback/reactions inserts anonymous rows with user_id null on
-- purpose and only ever deletes the signed-in user's own rows, so: owners keep full
-- control of their rows, anyone may add an anonymous reaction, nobody may change or
-- remove one, and reads stay as they were.

drop policy if exists "Users can manage their own reactions" on public.message_reactions;

create policy "Owners manage their own reactions" on public.message_reactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Anyone can add an anonymous reaction" on public.message_reactions
  for insert to anon, authenticated
  with check (user_id is null);

create policy "Own and anonymous reactions are readable" on public.message_reactions
  for select
  using ((select auth.uid()) = user_id or user_id is null);
