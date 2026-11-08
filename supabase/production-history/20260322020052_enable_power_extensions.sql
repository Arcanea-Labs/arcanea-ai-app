-- Production migration 20260322020052_enable_power_extensions on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Enable Power Extensions
-- Unlocks: full-text search, vector/AI, scheduled jobs,
--          async HTTP, auto-timestamps, fuzzy matching
-- ============================================================

-- Trigram-based fuzzy text search (autocomplete, typo tolerance)
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Vector embeddings for AI/semantic search
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Scheduled background jobs (streak resets, cleanup, analytics)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Async HTTP requests from DB (webhooks, notifications)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Auto-update updated_at columns on row modification
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Case-insensitive text (usernames, emails, slugs)
CREATE EXTENSION IF NOT EXISTS citext SCHEMA extensions;

-- Hierarchical data (category trees, Gate progression paths)
CREATE EXTENSION IF NOT EXISTS ltree SCHEMA extensions;

-- Better full-text search with addons
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;
