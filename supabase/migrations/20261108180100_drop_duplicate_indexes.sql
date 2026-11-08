-- Each index below has an identical sibling (same table, columns, expression,
-- predicate, opclass and uniqueness) that stays in place, so reads are
-- unaffected and writes stop maintaining a second copy. None backs a
-- constraint. List computed from pg_index on production, 2026-11-08.

drop index if exists public.idx_chapter_notes_lookup;            -- keeps idx_chapter_notes_chapter
drop index if exists public.idx_chat_messages_created_at;        -- keeps idx_chat_messages_created
drop index if exists public.idx_collection_items_collection_id;  -- keeps idx_collection_items_collection
drop index if exists public.idx_collection_items_creation_id;    -- keeps idx_collection_items_creation
drop index if exists public.idx_conversations_user;              -- keeps idx_chat_conversations_user_id
drop index if exists public.idx_council_convenings_council_id;   -- keeps idx_convenings_council
drop index if exists public.idx_creations_search_vector;         -- keeps idx_creations_search
drop index if exists public.idx_likes_creation_id;               -- keeps idx_likes_creation
drop index if exists public.idx_luminor_councils_user_id;        -- keeps idx_councils_user
drop index if exists public.idx_luminors_search_vector;          -- keeps idx_luminors_search
drop index if exists public.idx_seats_council;                   -- keeps idx_council_seats_council_id
