-- Production migration 20260418085642_luminor_memory_fk_indexes_20260418 on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Perf hardening: cover FK user_id on both luminor_memory_* tables.
-- The existing indexes have leading luminor_id, which doesn't satisfy the FK
-- index requirement on user_id alone. Add narrow user_id indexes.
create index if not exists idx_memory_items_user_id
  on public.luminor_memory_items(user_id)
  where user_id is not null;

create index if not exists idx_memory_blocks_user_id
  on public.luminor_memory_blocks(user_id);
