# Arcanea Atlas: place, time and perspective

Status: implementation candidate. All new terrain, observers, chapter fragments and event examples are synthetic and provisional; no Arcanea canon is promoted.

## Decision and ownership

Extend `Arcanea-Labs/arcanea-ai-app`, base `1b265e81a2031589e279f8dee1a557cc0b2c306d`, rather than the older web app in `Arcanea-Labs/Arcanea`. Keep `/atlas` and its existing staging geography projection. Add `/atlas/world`, its private review route and synthetic chapter records. Schemas and reconstruction live in the existing `@arcanea/schemas` and `@arcanea/world-engine` packages. The legacy staging adapter reuses existing geography/containment validation and never promotes staging material.

Recipient: a reader locating a chapter in a world, and an author checking what each observer can know. Primary action: change chapter or perspective and inspect the resulting places, accounts and sources. Current alternative: an entire world bible exposed to the browser and manually reconciled timelines. The output is an exportable, server-projected world state.

Maker owns the implementation; independent engineering and design reviewers judge the candidate. Human approval remains the merge boundary. This document is not production or customer acceptance evidence.

## Established reality

- The older source repository's locked vault is pinned at `afc2f17d46bd2659e296edc8b4a2dc4acc0b5cfe`; its exact SHA-256 is in `apps/web/lib/atlas/canon-source.json`.
- That source establishes the ten Gate-keeper identities/bonds, not their map coordinates. The canon tab therefore keeps them unplaced. No portraits or character interpretations were generated.
- The live product has a separate, older vault. This slice does not reconcile or edit either vault. It cites the explicitly selected source rather than blending contradictory mirrors.
- Existing Atlas geography, temporal engine, design tokens, Supabase cookie authentication and Vercel project are reused. Existing public world/book/reading-progress tables remain unchanged. The optional legacy-world FK preserves identity without copying existing creator records.
- Existing Supabase project: Arcanea, PostgreSQL 17.6, EU Central. PostGIS 3.3.7 and pg_jsonschema 0.3.3 were available but initially not installed. No new database project, branch, subscription or storage bucket was created.
- Relevant open product work includes schema-truth PR #731. The additive private `arcanea_atlas` schema does not rewrite that work.
- Existing Cloudflare Workers include canon, creature atlas, reader and publishing preview. None is replaced. R2 is not expanded; current product instructions select Vercel Blob for new binary storage. This slice needs no new blob store.
- The shared Starlight Arcanea pack was inspected. Its restrained product chrome and Geist/editorial roles inform this surface; content remains distinct from interface chrome.

## Three experience directions

| Direction | Composition and type | Scene and interaction | Decision |
| --- | --- | --- | --- |
| Cartographic reading desk | Persistent map, compact index and evidence inspector; Geist controls and occasional editorial accent | 2D first; chapter/perspective reconstruct the same scene; optional demand-rendered 3D | Selected: keeps source and uncertainty beside the geography |
| Cinematic world entry | Full-screen 3D, large editorial opening, controls disclosed after entry | Orbit and spatial reveal first; evidence in a drawer | Deferred: increases GPU and navigation cost before the reader understands the scene |
| Chronology ledger | Dense event table, horizontal time strip, small map inset | Compare valid time and knowledge time before spatial exploration | Retained as an author workflow direction; weaker as the first literary experience |

The synthetic contour landscape is procedural scene content, not evidence of Arcanea geography. No external imagery is required. All palette values live in the existing design-system package. The current app already loads Geist/Instrument Serif; the route reuses those fonts.

## Model and reconstruction

Namespaces are `arcanea`, `starlight`, and `simulation`. A coordinate is either a local frame/metres/x/y/z point or WGS84 longitude/latitude. They cannot be mixed silently. Unknown coordinates stay null. Containment IDs are validated; legacy polygon containment remains in the existing geography engine. Position records form trajectories; portal references require a portal entity. `checkJourney` verifies speed/time/reference continuity and permits only an explicitly approved frame connection.

A record has two half-open intervals: world validity and transaction knowledge. It also has a logical assertion ID, revision, branch, chapter reveal, audience, known observers, status and source IDs. Reconstruction first resolves transaction revisions within each branch, clips parent history at forks, applies active branch overlays, then enforces visibility. Ties use stable IDs. Contradictory observation values remain attributed records and produce a conflict, never an averaged truth score.

Branch, entity and source metadata have their own reveal/audience policy. Hidden references, source IDs, containment parents, knowledge edges and counts are removed as well as prose. Character views require explicit `knownBy`; a query parameter never grants a live role. Author authority comes from database ownership/grants, never editable user metadata.

## Persistence and approval

A bounded, versioned world packet stores the typed record stream in a private schema. This deliberately avoids a second copy of existing `worlds`, characters, locations or manuscripts. The packet cap is 2 MB / 2,000 records / 2,000 entities / 64 branches. At higher scale, normalize/index records behind the same API after measuring real workloads.

PostGIS stores only explicitly consented real-world positions, separately from fictional frames. Consent is tied to the signed-in subject, atlas-display purpose, precision, expiry (at most 24 hours) and revocation. Coarse coordinates are rounded before storage. Personal coordinates cannot be smuggled through world imports. Queries recheck consent at read time. No GPS collector or background location tracking exists.

All private tables deny direct anon/authenticated access. Narrow security-definer RPCs use an empty search path and explicit identity/ownership checks. Generated JSON Schema validates direct RPC inputs, independently of HTTP Zod validation. Supabase uses the existing authenticated cookie client; no service-role key is used by the Atlas application.

A proposal binds the record, referenced entity metadata and sources into one database-generated SHA-256 receipt and base revision. The owner sees this whole bundle before deciding. Approval locks the world, validates the exact receipt/revision, closes only branch-local transaction predecessors, appends a new UTC-stamped approved revision and admits the referenced entities atomically. A replay or stale base returns conflict. Imported records can complete this path. The locked Arcanea vault remains outside this workflow; approving a private world assertion is not a `/lock-decision`.

Outstanding proposals and pending retrieval are capped at 100. HTTP bodies are bounded while streaming. Mutation origins must match. There is no anonymous proposal endpoint or public-world publication toggle.

## Runtime contracts

- `GET /api/atlas/snapshot`: exact public GET exception in the existing proxy; only immutable source excerpts and synthetic fixtures. Unknown query keys and author escalation are rejected.
- `POST /api/atlas/worlds`: import a validated provisional private packet, optionally linked to an owned existing world.
- `GET /api/atlas/worlds/:id`: database-projected live view, then the same reconstruction engine; `chapter`, `validAt`, `knownAt`, `branch` are bounded filters, not privileges.
- `GET /api/atlas/worlds/:id?pending=true`: author/owner proposal bundle ledger.
- `POST /api/atlas/worlds/:id`: propose a record or approve/reject an exact bundle.
- `POST /api/atlas/worlds/:id/access`: owner view grants; explicit self-location consent and revocation.
- `/atlas/world?world=:id&branch=main`: open the authorized private world. Root timeline defaults to `main`; pass another branch explicitly for imported packets using a different root ID.

Real basemaps use MapLibre only after a per-view consent action explaining IP/view-area transmission to OpenStreetMap. No entity coordinates or geolocation API are queried by the demo. deck.gl is not added: this slice has no data volume that justifies another renderer. R3F 9 pairs with the existing React 19 stack; the installed peer contract was checked. MapLibre 6 uses named/module namespace exports, verified by focused compilation.

## Verification and deployment boundary

Run:

```sh
pnpm --filter @arcanea/schemas build
pnpm --filter @arcanea/design-system build
pnpm --filter @arcanea/world-engine build
node --import tsx --test tests/atlas/engine.test.ts
node --test tests/atlas/csp.test.cjs
pnpm --dir apps/web exec tsc -p tsconfig.atlas-world.json --noEmit
pnpm --dir apps/web exec eslint components/atlas app/atlas/world app/api/atlas lib/atlas proxy.ts --max-warnings=0
```

`tests/atlas/database.sql` runs after the migration inside a transaction and rolls back every test identity and world. It tests direct RPCs, approval, replay, reader and cross-tenant access, timestamp format and PostGIS consent/revocation. After rollback verification, the additive schema was activated on existing Arcanea project `hcfhyssdzphudaqatxbk` via `apply_migration`, ledger `20261114000655`. The repository migration filename matches that ledger. Post-activation database regressions passed inside rollback; no synthetic identities or worlds were retained. PostGIS3.3.7 and pg_jsonschema0.3.3 are active. Existing world/book/auth tables and policies were not modified.

Security advisors report four Atlas `rls_enabled_no_policy` informational notices and nine signed-in `SECURITY DEFINER` RPC warnings. These are intentional: direct schema/table access is revoked and RLS denies it; the RPCs are the narrow authenticated boundary with explicit ownership/grant checks and empty search paths. Do not add permissive policies to silence these findings. Review guidance: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .

Browser evidence under `docs/evidence/atlas-world/` identifies its environment. The isolated harness uses the actual React components, schema and reconstruction sources; it demonstrates responsive reflow, chapter/perspective behavior, R3F and consent gating. It does not establish full Next.js/auth/deployment acceptance. The hosted Vercel preview built all9 tasks successfully at source742d5abd; Next type checking remains enabled. Live chapter/API checks passed on that deployment. Final navigation/GPU fallback repairs require receiving validation at the final preview source. The Node 24 Tailwind `createRequire` repair is necessary for loading the existing configuration.

Rollback before merge: delete no production data; abandon the branch/preview. After a normal merge: revert the reviewed application commit and redeploy the previous accepted Vercel source. Keep private database records; revoke the new RPC execution grants to disable writes while retaining recovery data. Do not drop a populated schema as an automatic rollback.

## Cost and operating limits

No generation API was called and no new paid service was purchased. This slice adds no fixed subscription. Database CPU/storage and Vercel transfer/execution use existing plan entitlements; remaining quotas/credit applicability have not been established. Public OpenStreetMap tiles are suitable only within their tile policy and explicit user consent; choose a contracted basemap provider before sustained scale.

Planning workload, not a measurement: 1,000 monthly readers × 10 snapshots × 50 KB is roughly 0.5 GB API transfer, plus cacheable application assets. A 60 ms reconstruction budget would be 10 CPU minutes for those 10,000 calls; actual deployed latency and database CPU must be measured. Keep the first pilot within current entitlements and a €5 incremental usage target, then set provider alerts using observed bills. Cloudflare browser-rendering evidence requests were bounded; startup-credit coverage was not assumed.

Source links: https://r3f.docs.pmnd.rs/getting-started/installation · https://maplibre.org/maplibre-gl-js/docs/ · https://supabase.com/docs/guides/database/extensions/postgis · https://supabase.com/docs/guides/database/extensions/pg_jsonschema · https://operations.osmfoundation.org/policies/tiles/
