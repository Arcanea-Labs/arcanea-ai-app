<!--
PR Discipline (May 2026):
- Squash-merge only. Auto-delete on merge is enabled.
- Branch protection requires linear history.
- Use conventional commit prefix in title: feat / fix / chore / docs / refactor / perf / test / ops / build
- Scope is required: feat(scope): description (e.g., feat(books): print route)
- Keep PRs focused on one concern. Cross-cutting work splits into multiple PRs.
- Stale PRs (>14d untouched) are closed in weekly sweep.
-->

## Summary

<!-- 1-3 sentences: what changed and why. The "why" is more valuable than the "what". -->

## Changes

<!-- Bullet list of the most important changes. Skip if Summary covers it. -->

-

## Test plan

<!-- How a reviewer can verify this works. Concrete steps, expected results. -->

- [ ]
- [ ]

## Risk / rollback

<!-- Reversibility: how to undo if this breaks. Skip for docs-only / config-only PRs. -->

-

## Related

<!-- Links to: issues, prior PRs, decision docs in docs/ops/ or planning-with-files/. -->

-

## Evidence

- Tests: `<N> pass, 0 fail` (command run: ...)
- Checks: lint / typecheck / build results, or why not run
- UI changes: screenshots committed under docs/design/<scope>/screens/ at 1440, 768, 390 px, or 'no UI change'
- Design lock: path to docs/design/<scope>/design-lock.md, or 'no UI change'
- Stacks on: #<PR> / <branch>, or 'main'
- Independent review: requested from <Cloudflare Starlight Review | Grok | Codex> on <head sha>
- Risk: what could break, and how it was checked
