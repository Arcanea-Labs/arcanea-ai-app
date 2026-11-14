---
name: arcanea-supabase
description: Use for any Arcanea work that touches the database, auth, storage, RLS, RPC functions, migrations or the Supabase project hcfhyssdzphudaqatxbk. Covers how Arcanea's schema history really works (production history vs supabase/migrations), the drift check, the RLS and SECURITY DEFINER rules this project has already been burned by, and which Supabase client to use where. Pairs with the general `supabase` and `supabase-postgres-best-practices` skills.
---

# Arcanea on Supabase

Project `hcfhyssdzphudaqatxbk` ("Arcanea", eu-central-1, Postgres 17). One production database, no staging branch. Every table in `public` has RLS on.

## Schema truth: two folders, one source

- `supabase/production-history/` is what production has applied, mirrored verbatim from `supabase_migrations.schema_migrations`. Read it to learn the real schema. Never edit it by hand.
- `supabase/migrations/` is what the repo would apply. Until the 2026-11-08 reconciliation lands, most of its older files carry different timestamps from production, and several were never applied.
- `supabase/drift-report.json` classifies every repo-only migration by checking its tables and functions against the live database: `APPLIED-EQUIV`, `PARTIAL`, `MISSING`, `NO-OBJECTS`.

Before writing code that queries a table or calls an RPC, confirm the object exists in production. A table defined in `supabase/migrations/` is not proof. In October 2026 the billing kernel, chat snapshots, generation jobs and creation-engine assets all merged to `main` with code that called them, and none were applied.

```bash
node scripts/supabase-drift.mjs            # offline: repo vs production mirror
node scripts/supabase-drift.mjs --refresh  # re-mirror first (SUPABASE_ACCESS_TOKEN, scoped PAT)
```

Exit code 1 means a repo migration newer than production's head is unapplied.

```bash
node scripts/supabase-references.mjs --list   # app code vs supabase/production-objects.json
```

This catches `.from('table')` and `.rpc('fn')` calls to objects production lacks, which TypeScript misses while clients are typed `any`. CI (`.github/workflows/supabase-guard.yml`) fails on any reference not already in `supabase/known-missing-references.json`. When a migration is applied, refresh `production-objects.json` and shrink the baseline; never grow the baseline to make CI pass.

Security fixes get a probe in `supabase/tests/client-trust-boundaries.sql`, which rebuilds the production grants on a disposable Postgres, applies the migrations and asserts both the closed hole and the legitimate write.

## Writing a migration

1. Name it `YYYYMMDDHHMMSS_snake_name.sql` with a timestamp later than the newest file in both folders.
2. Enable RLS on every new `public` table in the same migration, and write policies for the real access model. RLS with zero policies denies every client, which is only right for service-role tables. Say so in a comment when you mean it.
3. Policies: `to authenticated` plus an ownership predicate, `(select auth.uid())` wrapped in a subquery (the advisor flags the bare form as `auth_rls_initplan`; production has 68 of those left). UPDATE policies need both `using` and `with check`.
4. Functions: `set search_path = public, pg_temp`. Prefer `security invoker` when RLS already scopes the rows. If it must be `security definer`, check `auth.uid()` inside, revoke from `public, anon`, and grant only the role that should call it.
5. Index every foreign key. Check `pg_index` for an identical existing index first; production carried 11 exact duplicates until 2026-11-08.
6. Applying to production is a human decision. Merging a migration does not apply it; no workflow runs `supabase db push`. Hand over the file and the advisor output.

## Lessons this project already paid for

- **Privilege lockdowns break callers silently.** The 2026-08-10 lockdown revoked EXECUTE on `get_unread_notification_count` from `authenticated`; the badge returned 403 on every poll (331 times on 2026-11-07) and nobody noticed for months. After any `revoke`, grep `apps/web` for `.rpc('<name>'` and check edge logs for 403 on `/rest/v1/rpc/<name>`.
- **PostgREST answers a missing table with 404, not a Postgres error.** Postgres logs stay clean; look at edge logs instead.
- **The server client falls back to a mock when env is missing.** `lib/supabase/server.ts` returns a proxy whose `getUser` resolves to `null` and whose uploads succeed with `null` data. A blank page or "logged out" state in a preview can mean missing env, not missing auth.
- **Views bypass RLS** unless created `with (security_invoker = true)`.
- **An ownership policy is not a business rule.** `credits` lets users insert and update their own row, so any signed-in user can set their own balance; `marketplace_agents` lets creators set `is_certified`. Balances, plans, credits, approval and trust flags are written server-side only (service role or a guarded RPC), never through a client-writable policy.
- **"Signed in" is not "allowed to see drafts".** `... or auth.uid() is not null` on a read policy exposes every draft to every account. Scope drafts to the owners.

## Which client

| Where | Use |
|---|---|
| Server Components, Route Handlers, Server Actions | `lib/supabase/server.ts` (cookie session, user's RLS) |
| Browser | `lib/supabase/client.ts`; `env.ts` accepts a publishable key (`sb_publishable_…`) or a legacy anon JWT and rejects other `sb_` keys |
| Trusted server jobs that must cross users | service role via `getSupabaseServiceRoleKey()`, never in a `NEXT_PUBLIC_` variable |
| Public, unauthenticated reads | `lib/supabase/public.ts` |

## Checks after any database change

Run the Supabase MCP or CLI equivalents: `get_advisors` (security, then performance), `list_migrations`, and an edge-log query for 4xx on the paths you touched. Report findings with the advisor's remediation link.
