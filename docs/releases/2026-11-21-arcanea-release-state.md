# Arcanea release state — 2026-11-21

Work order `pcv.06.arcanea-release-repair`. This document records evidence and recommendations only. Nothing was promoted, rolled back, redeployed or merged, and no Vercel or Supabase state was touched.

Reference points: `main` = `7d39606d` (#750). Production build = `f6a9d74` on `agent/codex/academy-directors-study-release-20261120`.

## 1. Production deploy provenance

**Source of the deploy fact:** the work-order recon says arcanea.ai production is built from `agent/codex/academy-directors-study-release-20261120` at `f6a9d74`. This session did not query Vercel. Everything below is git evidence about that commit.

### Topology

```
0bc8436 (2026-11-06, #716)  ← merge-base of production and main
├── main: +25 commits → 7d39606 (#750)
└── production branch: +4 commits → f6a9d74 "[preview] Repair Academy course discovery…"
```

`git log --oneline main..f6a9d74` (what production has that main lacks):

```
f6a9d74 [preview] Repair Academy course discovery, Library navigation and world creation canonical
905d035 [preview] Use the formatter-verified Academy entry from #753
8cdf6d8 [preview] Include reviewed public Library tools from #689 in the Academy release
107779a [preview] Release Elara's director study on the served Arcanea baseline (#753)
```

Those four commits re-apply the user-facing content of #753, #689, #746, #747 and #750 onto the Nov 6 baseline. All five are already on main. Production therefore holds **no work that main lacks**. It is main's Academy/Library slice transplanted onto an older tree.

`git log --oneline f6a9d74..main` (25 commits production lacks) includes:

| Commit                                                | PR                           | Production impact                                                                                    |
| ----------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `dcdc7ab`                                             | #737                         | **Security.** Closes public routes that spend server model keys (details below)                      |
| `0c2362f`                                             | #700                         | RLS perf: caches request identity in 68 policies (migration; DB apply state not checked here)        |
| `35c6674`                                             | #723                         | `viewer.v1` account contract with fail-closed plan resolution (`/api/v1/me` is absent in production) |
| `a422887`                                             | #730                         | Repository identity after transfer (73 files)                                                        |
| `83fa14c`, `5dab6d1`, `5ad5ff3`, `64a5b70`            | #733, #726, #739, #752       | Dependency patch groups, hono, @hono/node-server                                                     |
| `d32c9ed`, `562c760`                                  | #734, #738                   | Hero redesign                                                                                        |
| `3b9ac12`, `7ca1df9`, `1b265e8`, `cfbf82c`, `0e86e70` | #701, #711, #712, #742, #743 | Gentle Powers gallery, Music Mentor docs + fix, sitemap `/studio` exclusion                          |

Diff `main..f6a9d74`: 227 files, +16,927 / −12,931.

### The security gap (source-verified at `f6a9d74`)

- `POST /api/chat/swarm` at `f6a9d74`: no `auth.getUser()`, no rate limit, calls `createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. On main it returns 401 before reading the body and is rate limited per user.
- `GET /api/voice/greeting` at `f6a9d74`: an unbounded `tenant` forces paid text-to-speech calls and grows the cache. Main bounds tenant, cache and concurrency.
- `/api/studio/generate-image` exists at `f6a9d74` (Stability / OpenAI keys, returns stock photos as "generations"). Main deleted it.
- `arena/run`, `swarm/invoke`, `living-lore/encounter`, `forge/luminor`, `worlds/generate-image` have no limiter at `f6a9d74`.

This is code on the production commit. Whether the live process serves exactly this commit is the recon claim above. No request was sent to production, since the vulnerable route spends money.

### Correction to a likely assumption: `next`

Production and main both resolve **next 16.4.1**. #744 ("bump next to 16.4.5") changed only one lockfile line. `pnpm-workspace.yaml` still carries `overrides: next: "16.4.1"`, so main's importer resolves `next@16.4.1` despite `apps/web/package.json` declaring `16.4.5`. Moving to 16.4.5 needs the override changed. That belongs in a separate PR.

## 2. Near-ready PRs: merge order and local evidence

### Recommended order

| #   | PR                                           | Head      | Why here                                                                                                                                                                         |
| --- | -------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **#763** artwork master digest               | `c45826e` | Smallest blast radius (3 files, `packages/rights-manifest` only), 0 behind main                                                                                                  |
| 2   | **#725** P0 security definer + anon profiles | `d630533` | **Held: not merge-ready at this head.** Three verified defects, see "#725: blocking defects" below. Merges cleanly and tests pass, but the tests miss these. Re-slot after a fix |
| 3   | **#767** Genesis collector review            | `31cff71` | Base of the Genesis stack                                                                                                                                                        |
| 4   | **#765** Genesis displayed license           | `858639b` | **Strict superset of #767** (`#767 ⊂ #765`). After #767 lands, #765 reduces to its 3 reconcile commits. Merging #765 alone and closing #767 is equivalent                        |
| 5   | **#676** web-excellence install              | `b010fa1` | Tooling, CI hooks, agents. Last so a hook change can't gate the product merges above. 18 behind main                                                                             |

### Evidence

All commands ran on an integration branch built by `git merge --no-ff` of each PR head onto `main@7d39606`, in the order above. **All five merged with zero conflicts.** Integrated tip: `52d3371` (local only, not pushed). Node 22.23.5, pnpm 11.28.4.

| Step      | Commit    | Command                                                                                                                                      | Result                                                                |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| install   | `52d3371` | `pnpm install --frozen-lockfile`                                                                                                             | ✓ lockfile passes supply-chain policy (1666 entries)                  |
| #763      | `52d3371` | `pnpm --dir packages/rights-manifest test`                                                                                                   | 23 pass / 0 fail                                                      |
| #725      | `52d3371` | `pnpm run test:security` (migration audit `--fail-on high`, contract test, PGlite runtime test that applies the real migration, audit tests) | 34 pass / 0 fail / 0 skipped                                          |
| #767/#765 | `52d3371` | `node scripts/test-genesis-commerce.mjs`                                                                                                     | 9 pass / 0 fail / 1 skip (operator-supplied private folio, by design) |
| #767/#765 | `52d3371` | `node scripts/test-genesis-operator.mjs`; `tsx scripts/test-genesis-offer.mts`                                                               | 1/1 pass; 1/1 pass                                                    |
| #676      | `52d3371` | `node .claude/ci/estate-guard-scan.mjs --root .`                                                                                             | 0 critical / 0 high. Findings ⊂ main's (one SK004 medium removed)     |
| #676      | `52d3371` | `node .claude/ci/web-guidelines-lint.mjs apps/web/components/roadmap/roadmap-hero.tsx`                                                       | 0 errors, 1 warning (gradient-clipped heading, line 314)              |
| web       | `52d3371` | `pnpm turbo run type-check --filter=@arcanea/web`                                                                                            | ✓ exit 0, 0 TS errors                                                 |
| web       | `52d3371` | `pnpm turbo run build --filter=@arcanea/web`                                                                                                 | ✓ 9/9 turbo tasks                                                     |

### #725: blocking defects (verified in source at `d630533`)

An independent review raised these. Each was confirmed by reading the files at the stated lines:

1. **Signed-out profile pages break.** The migration revokes anon `SELECT` on `public.profiles`. `apps/web/app/profile/[username]/page.tsx` (lines 16, 39) and `apps/web/app/api/profile/[userId]` still call `getProfile()`, which does `.from('profiles').select('*')` (`apps/web/lib/database/services/profile-service.ts:11`). Anonymous reads must move to `public_profiles`.
2. **The view leaks inactive profiles.** `public_profiles` filters `where coalesce(is_active, true)`. The RLS policy it replaces for anon (`20250101000002_rls_policies.sql`, "Public profiles are viewable by everyone") requires `is_active = TRUE`. The view runs with owner rights and bypasses RLS, so rows with a NULL `is_active` become public. The filter needs strict truth (`(to_jsonb(p)->>'is_active')::boolean is true`).
3. **The audit baseline has an empty fingerprint.** `scripts/migration-audit-baseline.json` holds `destructive-statement|…/20261012030707_atomic_chat_snapshots.sql|Destructive statement: ` with an empty statement. In `scripts/audit-migrations.mjs` (~line 200), the regex match begins at the preceding `;`. The slice then starts on that `;`, and `statementEnd` stops immediately. Any new destructive statement in that file would produce the same empty fingerprint and pass `--fail-on high`.

The green `test:security` row above does not cover these paths. #725 stays out of the merge order until they are fixed, with a test for each.

### #725: Starlight Review block, assessed

The external `Starlight Review` check (cf-checker) is the only red check on #725. It flags:

- **high**, `ratings/route.ts:147`: "view-based profile read runs as authenticated user and may return nothing due to view RLS". **Assessed as a false positive.** `public.public_profiles` is created without `security_invoker`, so Postgres runs it with the view owner's rights and `profiles` RLS doesn't filter it. Authenticated and anon callers both get rows. The PGlite runtime test exercises this view with Supabase-shaped roles and passes.
- **medium**, migration line 64: `to_jsonb(p) ->> 'col'` returns NULL for a missing column instead of failing. Real, fail-soft. It is acceptable for a projection designed to survive column drift. An owner may prefer explicit columns.
- **low**, `profiles/[username]/route.ts:39`: structural cast. Cosmetic.
- Expect the Supabase advisor to flag `public_profiles` as a "security definer view". That is the intended design (an allowlisted projection over a table anon can no longer read), and it should be acknowledged rather than "fixed" with `security_invoker`, which would return zero rows to anon.

Of the two model reviewers, one approved and one requested changes, and the request rests on the high finding above. Starlight's finding is still assessed as a false positive. Its block nevertheless lands on a PR that does have real defects, listed in the section above.

### #762 (not in the merge set)

Head `fb6f451`. CI failure is infrastructure, not code. The `Verify community signup and recovery in the built browser` step has a 5-minute budget, and `playwright install --with-deps` spent all of it pulling fonts from the Azure apt mirror (about 90 s per package). `verify-community-capture-browser.cjs` never ran, so the screenshot directory is empty. #762 touches only 8 files under `apps/web/app/collections/genesis/study/`.

Local check, run once: `pnpm turbo run build --filter=@arcanea/web` ✓ 9/9, then `next start -p 3001` with the CI placeholder Supabase env, then `node scripts/verify-community-capture-browser.cjs`. The only change was `executablePath` pointed at the preinstalled Chromium 153, in a throwaway copy. Result: **passed, desktop ✓ / mobile-375 ✓ / reduced-motion ✓**. Re-run the job. Separately, the 5-minute budget is too small for a cold `--with-deps` install. Caching the Playwright deps or splitting install into its own step would stop this recurring.

## 3. Dependabot PRs

All three failed for the **same root cause**. Dependabot resolved transitive versions published hours before the CI run, inside pnpm 11's default 24h `minimumReleaseAge`:

- #706: `minimatch@11.0.8` published 2026-11-11T09:50Z, CI at 14:38Z
- #705: the same `minimatch@11.0.8` (published 09:37Z), CI at 14:37Z
- #741: `postcss@8.5.33` published 2026-11-13T22:44Z, CI at 2026-11-14T01:47Z

#706's "Verify lockfile matches package.json" failure is fallout from the same violation, not a real mismatch. The install aborted, then `verify-web-lint-runtime` crashed with `Cannot find module 'eslint'`.

No security setting was changed. `minimumReleaseAge` stays at its default.

| PR                                                            | Verdict                                                                                                                                                                                                                                                                              | Local evidence (branch head, unchanged policy)                                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#706** minimatch 10.2.6 → 11.0.1 (`packages/arcanea-hooks`) | **Merge after a CI re-run.** No code or lockfile change needed. The entries have aged past the cutoff                                                                                                                                                                                | `435dbe6`: `pnpm install --frozen-lockfile` ✓ policy pass; `node scripts/lockfile-drift.mjs` ✓; `verify:web-lint-runtime` ✓; `verify:runtime-contracts` ✓; arcanea-hooks `tsc` ✓ + 120/120 tests                                                                                      |
| **#705** glob 11 → 14.0.2 (root + `packages/media`)           | **Merge after a CI re-run.** Note that `packages/media/src` doesn't import `glob`, so the dependency there is likely dead and could be dropped instead                                                                                                                               | `5c805b8`: frozen install ✓ policy pass; `verify:runtime-contracts` ✓; `packages/media` `tsc` ✓; glob 14 engines `18 \|\| 20 \|\| >=22` (matches the Node 24 floor)                                                                                                                   |
| **#741** astro 7.3.5 → 7.4.7 (`docs/atlas`)                   | **Close.** It can never pass as filed. `scripts/verify-atlas-dependency-lock.cjs` asserts the Atlas lockfile equals the immutable pre-migration graph at `d2285fb` (plus the sharp/source-map-js patches). Any astro bump fails that assertion by design, independent of release age | `80ab7f3`: frozen install ✓ policy pass (postcss aged), Atlas tests 7/7, `astro build` ✓, but `verify-atlas-dependency-lock.cjs` ✗ (`astro@7.4.7` ≠ preserved `7.3.5`). Follow-up: add a `docs/atlas` ignore to `.github/dependabot.yml`, or re-baseline the Atlas graph deliberately |

Both re-runs are 12 commits behind main and touch `pnpm-lock.yaml`. Use `@dependabot rebase` instead of a bare re-run if the lockfile drifts.

## 4. #728 (renaissance): repaired in a separate draft PR

#728's head `e690b28` (last commit 2026-11-08, more than 24h idle) failed `tsc` with **44 errors, all in `apps/web/app/renaissance/renaissance-client.tsx`**. The client imported nine names that `@/lib/renaissance` never exported and read fields the lib's types don't have. Fix `5f079ef` on `agent/claude/pcv-06-release-repair` rebinds the client to the real, tested exports, with no lib changes. Result: `tsc` 44 → 0, renaissance tests 7/7, `turbo run build --filter=@arcanea/web` 9/9 tasks with `/renaissance` prerendered. The critic sandbox keeps its semantics: clean preset PASS at 92, contaminated preset REJECT at 67. Draft PR targets #728's branch, not main. #728 itself remains 25 behind main.

## 5. Owner decisions

**Decision 1: promote main, or accept the branch build.** This is the one that matters.

- _Promote main_ (recommended): production gains #737's closure of unauthenticated, unrated model-key spend, plus 24 other merged commits. It loses nothing, because every user-facing change in the four `[preview]` commits already landed on main via #746, #747, #750, #753 and #689. Main still needs a production build verified before promotion. The Vercel preview of `7d39606` is the artifact to check.
- _Accept the branch build_: production keeps serving `/api/chat/swarm` without auth or rate limit on the server Anthropic key, plus the TTS and image routes above, until the next promotion. Accepting this means accepting open-ended spend on those keys. If chosen, put provider-side spend caps or alerts on the keys those routes use (Anthropic, the TTS provider, Stability, OpenAI) now.

Every day on the branch build is a day of uncapped key exposure, and promotion has no feature cost. The question is only who signs off the main build and when.

**Decision 2: #725's migration path.** Merging #725 lands `supabase/migrations/20261107000001_arcanea_p0_security.sql`. No workflow in this repo applies migrations, so merge ≠ apply. Someone with Supabase access must apply it deliberately and run the advisor afterwards. Name that person before merging. First, #725 needs the three blocking defects above fixed: the signed-out profile reads, the `is_active` filter and the audit fingerprint. Then decide on the Starlight `REQUEST_CHANGES` block, whose high finding is assessed above as a false positive.

**Decision 3: Genesis stack.** Merge #767 then #765, or merge #765 alone and close #767. Both leave the same tree.

**Decision 4: #741.** Close it and ignore `docs/atlas` in Dependabot, or schedule a deliberate Atlas graph re-baseline.
