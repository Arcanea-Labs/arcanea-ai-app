# Creative conversation context recovery — 18 November 2026

State: local code candidate; not merged, deployed or accepted by a customer.

## Task contract

- Scope: stop removed project context returning to a saved creative conversation during cloud hydration.
- Owner/provider: OpenAI Codex, Arcanea creative-journey lane.
- User job: keep a scene and its conversation while removing its former project context; a later sync must preserve that decision.
- Base: `cfbf82ccebc570f041cead1df29ee2256758b05d` (`Arcanea-Labs/arcanea-ai-app` main).
- Owning programme: creator journey #642 / product quality #427. This slice does not close either programme.
- Files: `apps/web/lib/chat/local-store.ts`, its existing `__tests__/local-store-projects.test.ts`, this receipt.
- Non-goals: new database/auth/billing/provider integrations, UI changes, canon promotion, product claims or production release.
- Acceptance: project removal marks only affected browser snapshots dirty, retains their optimistic revision and content, resists a later stale cloud copy; an explicit remote null removes a clean local assignment; absent project metadata retains local context as unacknowledged work; unrelated conversations remain unchanged.
- Stop: failed relevant checks, unreviewed authorization/data semantics or unresolved production ownership. Preserve the existing cache and customer work.
- Rollback: revert the code-only candidate through normal review; do not delete browser or cloud conversations.

## Reproduction and implementation

The existing project-removal helper changed `projectId` without changing `cloudDirty`. A previously acknowledged copy therefore remained eligible for replacement by a newer cloud copy carrying the old assignment. Separately, nullish coalescing in the merge restored an old project when a clean newer remote snapshot explicitly said `projectId:null`.

Two new regression cases failed on the original source. The fix marks affected removal snapshots dirty and updates their timestamp, keeping the prior cloud revision. Merge now distinguishes an omitted field from explicit null. Existing manuscript content, actor-scoped keys, cache policy and RPC protocol are unchanged. Additional tests preserve unrelated clean sessions and absent-metadata behavior.

## Verification

- Node `v24.22.1`, matching `.nvmrc` major24.
- Pinned pnpm `11.28.4` frozen filtered web/workspace install passed with no lockfile changes. First sparse attempt lacked the committed minimatch patch; including the existing `patches/` directory resolved it without modifying policy or the lockfile.
- Changed-source ESLint: passed, zero warnings.
- Existing account-storage/cloud-persistence suites:50 tests passed against actual source with controlled transport/storage fixtures. No real account/network persistence is inferred.
- The10 files listed by `apps/web` `test:projects`:50 checks passed, including9 local project-store cases. The ordinary tsx CLI invocation failed because this environment denies its Unix IPC socket; equivalent `node --import tsx` invocations from the web working directory execute all10 unchanged test files. An initial root-directory loader attempt stopped at its path alias, then the correct web cwd passed.
- Existing extract-message, runtime-metadata and trace-cursor tests also passed (overlaps with the project list are not additional independent coverage).
- Formatting and `git diff --check`: passed.
- Initial full web typecheck and build attempts overlapped with other heavy checks and both exited137. They are failed attempts, not successful checks. The single sequential retry with `NODE_OPTIONS=--max-old-space-size=2048` completed with exit2: prebuilt workspace declarations were absent (`@arcanea/design-system`, `@starlight/multilingual/routing`, `@arcanea/mcp-server/gateway`) and sparse checkout omitted `docs/worldbuilding/weight-of-wonders/living-crucibles-entries.json`. The changed local-store files had no reported diagnostics. This is a blocked full typecheck, not a pass. No further heavy retry was performed. Next gate: include required existing inputs/build workspace dependencies, then rerun full typecheck/build in an isolated adequately provisioned job.
- Full independent exact-head review, hosted acceptance and customer-value proof remain pending. This change has no visual surface; screenshot comparison is not applicable to this source slice.

## Production boundary

Connected Vercel audit identifies the production owner as `Arcanea-Labs/arcanea-ai-app`, repository1149281206 (old `frankxai/arcanea-ai-app` URLs redirect). Observed production deployment `dpl_2gZNxaAwHpjZmpkv6hKfjxnTBcRw` at source`0bc84365469f6d998dabf490ad501ef6694e35bf` belongs to project`prj_90OIWsAmfeswv8IG8WxqEAFefTOV`, attached to `arcanea.ai` and `app.arcanea.ai`. This candidate starts from newer main, so current source is not claimed to be serving production.

The complete authenticated chat → structured private world → edit → save → reopen → export journey still requires configured identity/provider access and a controlled acceptance run. Existing source already provides chat/world handoff, recovery, project docs/memory retrieval and gated Polar/Stripe billing. This slice extends that persistence boundary instead of creating another one.
