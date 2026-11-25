# Fixture provenance

- **Author:** Claude Opus 5.5, in a Claude Code cloud session for Arcanea Labs.
- **Date:** 2026-11-25.
- **Licence:** [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Credit "Arcanea Labs, Arcanea Narrative Benchmark fixtures".
- **Third-party text:** none. All 20 fixtures were written from scratch for this benchmark. This includes every brief, world rule, character, fact, probe and example sentence. No text, character, setting or plot comes from Arcanea canon, any published book, LongPage, Project Gutenberg or any other dataset.
- **Shared micro-world:** six fixtures (`reach-01` to `reach-06`) are set in the Saltglass Reach, an archipelago invented for this benchmark. It is not Arcanea canon and must not be promoted into it.
- **Generic elements:** genre conventions such as a locked room, a generation ship, a heist or a picture-book animal are common property. Any resemblance of a name to a real person or an existing work is unintended. If you find one, open an issue and the fixture will be renamed.

## What each file contains

`brief`, `worldBible` (5-10 rules), `cast` (3-6 characters with traits), `mustHold` (facts with contradiction patterns and a `violationExample`), `probes` (questions with evidence and contradiction patterns, plus `passExample` and `failExample`), `targetLength`, `tags`, and `knownNames` (declared proper nouns, used by the drift scorer). The shared-world fixtures also carry `continuityGroup`.

The example sentences in each file are test data for the regex checks, written by the same author under the same licence.
