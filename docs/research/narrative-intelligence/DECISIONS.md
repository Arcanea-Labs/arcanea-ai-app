# Narrative intelligence: architecture decisions

Author: Claude Opus 5.5, 2026-11-25. Revision 1. Status: proposed, waiting on a sign-off from a different provider.

## ADR-001: licences and data provenance

- PageStorm weights are Apache-2.0 according to their model cards, so we may call them as a provider.
- github.com/Pageshift-ai/pagestorm has no LICENSE file, which means all rights are reserved. We use none of its code. The staged protocol is written from scratch, working only from the paper and the model cards.
- LongPage has two parts. The planning traces are CC-BY-4.0. The book text is "other" (Project Gutenberg public domain). Gutenberg IDs were stripped, so we cannot confirm public-domain status per book outside the US. We do not redistribute the data or train on it, and no fixture uses it. If we use the schema ideas, we credit Pageshift Entertainment under CC-BY-4.0.
- Every benchmark fixture is original work written for Arcanea, released CC-BY-4.0, with a provenance file.

## ADR-002: canon stays independent of any model

- Canon lives in typed world-engine data and `.arcanea/lore`. Models only ever read it, and no model's output is canon.
- Anything generated starts with status `candidate`. Promoting it needs a human approval record `{approver, ts, ref}`. No code path writes to `.arcanea/lore`.
- Continuity checks (character ledger, timeline constraints, world rules) are pure functions. They make no LLM calls, so their verdicts can be reproduced.

## ADR-003: PageStorm runs behind a safety classifier, on compute we approve

- The model card says it was trained without safety and cannot refuse. The adapter will not construct unless a SafetyClassifier is supplied, and it classifies the prompt and every stage's output.
- No always-on paid inference. Runs go to a local GPU or to an ephemeral GPU that Frank approves for each run. Every stage writes a cost receipt. When a price is unknown, the receipt records `usdEstimate: null` rather than a guess.

## ADR-004: benchmark method

- v0 (lane C): deterministic scorers plus a blind two-family LLM panel on Workers AI. Panel disagreement is reported and never averaged away.
- v1: add our own version of the extraction-plus-deterministic-rule diagnostics that Pageshift uses (setup becomes a live problem, the same goal stays active, a blocked goal triggers a response, the mystery stays unresolved, the initial situation is clear, viewpoint control holds, exposition is motivated by local need). We also add per-chapter plan-following decay, because the authors name long-range consistency as their main limitation.
- Systems compared: frontier APIs, PageStorm 14B through vLLM, and the hybrid Arcanea pipeline (planner plus continuity state plus a frontier writer). Measured on quality diagnostics, originality (model-chosen-content diversity), consistency, editorial acceptance, latency and cost.

## ADR-005: re-grounding for long-range consistency (hypothesis)

- Before each chapter, the hybrid pipeline computes a continuity state: the character ledger folded to the current story time, the active timeline constraints and the relevant world rules. It passes that state in explicitly instead of relying on a long prefix.
- Success means beating the plan-following decay Pageshift reports (73.1% for chapter 1 down to 50.8% for the last chapter) on our own fixtures, scored with the same 1-7 rubric mapped to percentages. Until v1 has run, this is a hypothesis.
