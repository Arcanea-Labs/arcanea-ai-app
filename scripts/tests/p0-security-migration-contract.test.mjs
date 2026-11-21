import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261107000001_arcanea_p0_security.sql",
    import.meta.url,
  ),
  "utf8",
);
const view = migration.slice(
  migration.indexOf("create or replace view public.public_profiles"),
  migration.indexOf("revoke all on public.public_profiles"),
);

test("the P0 migration hardens every definer function by identity signature", () => {
  assert.match(migration, /p\.prosecdef/);
  assert.match(migration, /pg_get_function_identity_arguments\(p\.oid\)/);
  assert.match(migration, /p\.proconfig/);
  assert.match(migration, /d\.deptype = 'e'/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(migration, /^\s*begin;/m);
  assert.match(migration, /^\s*commit;/m);
});

test("anonymous clients lose table access to profiles and gain only the safe view", () => {
  assert.match(migration, /revoke select on table public\.profiles from anon/);
  assert.match(
    migration,
    /grant select on public\.public_profiles to anon, authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /grant select on (table )?public\.profiles to anon/i,
  );
});

test("the public view allowlist excludes billing, contact and private preference fields", () => {
  for (const forbidden of [
    "stripe",
    "subscription_status",
    "subscription_tier",
    "subscription_ends_at",
    "location",
    "website",
    "preferences",
    "metadata",
    "email",
  ]) {
    assert.equal(view.toLowerCase().includes(forbidden), false, forbidden);
  }
  for (const safe of [
    "display_name",
    "avatar_url",
    "bio",
    "magic_rank",
    "created_at",
  ]) {
    assert.ok(view.includes(safe), safe);
  }
});

test("intentional anon grants are documented, not silently expanded", () => {
  assert.match(migration, /luminors SELECT/);
  assert.match(migration, /arcanea_applications INSERT/);
  assert.doesNotMatch(migration, /drop\s+(table|schema)/i);
});

test("the public view hides profiles whose is_active is not true, as the RLS policy does", () => {
  // The view runs with its owner's rights and skips RLS, whose policy is
  // `is_active = TRUE`; treating NULL as active would publish hidden profiles.
  assert.match(view, /where \(to_jsonb\(p\) ->> 'is_active'\)::boolean is true;/);
  assert.doesNotMatch(view, /coalesce\(\(to_jsonb\(p\) ->> 'is_active'\)::boolean, true\)/);
});
