-- Production migration 20260418085515_swarm_security_fixes_20260418 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Fix: recent_chat_traces should use SECURITY INVOKER so RLS applies to the caller
drop view if exists public.recent_chat_traces;
create view public.recent_chat_traces
with (security_invoker = true)
as
select
  id,
  user_id,
  mode,
  planner_source,
  jsonb_array_length(plan_luminors) as luminor_count,
  total_ms,
  total_tokens,
  left(input, 240) as input_preview,
  left(coalesce(synthesis, ''), 240) as synthesis_preview,
  created_at
from public.chat_traces
order by created_at desc;

comment on view public.recent_chat_traces is
  'Recent swarm traces — runs under security_invoker so chat_traces RLS applies to the caller.';

-- Fix: match_memory_items needs explicit search_path
create or replace function public.match_memory_items(
  p_luminor_id text,
  p_user_id uuid,
  query_embedding extensions.vector(1536),
  match_threshold float default 0.6,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  source text,
  relevance_score numeric,
  similarity float
)
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  select
    m.id,
    m.content,
    m.source,
    m.relevance_score,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.luminor_memory_items m
  where m.luminor_id = p_luminor_id
    and (m.user_id = p_user_id or m.user_id is null)
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Fix: upsert_memory_block — same treatment (already had search_path but make explicit)
create or replace function public.upsert_memory_block(
  p_luminor_id text,
  p_user_id uuid,
  p_content text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.luminor_memory_blocks (luminor_id, user_id, content)
  values (p_luminor_id, p_user_id, p_content)
  on conflict (luminor_id, user_id)
  do update set content = excluded.content, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

-- Fix: prune_anonymous_chat_traces — drop elevated security_definer, wasn't needed (service_role already has all)
drop function if exists public.prune_anonymous_chat_traces();
create or replace function public.prune_anonymous_chat_traces()
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  with del as (
    delete from public.chat_traces
    where user_id is null
      and created_at < now() - interval '30 days'
    returning id
  )
  select count(*) into deleted_count from del;
  return deleted_count;
end;
$$;
comment on function public.prune_anonymous_chat_traces is
  'Deletes anonymous swarm trace rows older than 30 days. Safe to run on a daily cron as service_role.';
