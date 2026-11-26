# Narrative Bench v0 — run `example`

- Created: 2026-11-26T00:05:43.138Z
- Mode: **dry run** (mock systems, mock judges; numbers below test the pipeline, not any model)
- Fixtures: 3 · Systems: mock-faithful, mock-drift, mock-hybrid
- Judges: mock-judge-lexical, mock-judge-hash · Rubric: narrative-bench-rubric-v0
- TASTE bridge: unavailable: publishing-house not built (packages/publishing-house/dist/quality/evaluators/uniqueness.js missing)

## Deterministic scores

| System | OK | Facts held | Probes pass / contra / silent | Length in tol | distinct-2 | rep. 4-gram | max loop | alias drift | unknown names | cast cov. |
|---|---|---|---|---|---|---|---|---|---|---|
| mock-faithful | 3/3 | 11/11 | 9 / 0 / 0 | 3/3 | 0.346 | 0.392 | 1 | 0 | 0 | 100% |
| mock-drift | 3/3 | 8/11 | 2 / 2 / 5 | 0/3 | 0.432 | 0.41 | 4 | 3 | 0 | 100% |
| mock-hybrid | 3/3 | 11/11 | 9 / 0 / 0 | 3/3 | 0.346 | 0.392 | 1 | 0 | 0 | 100% |

## Cross-story continuity (shared micro-world)

| System | Group | World facts held in every story |
|---|---|---|
| mock-faithful | saltglass-reach | 3/3 |
| mock-drift | saltglass-reach | 2/3 |
| mock-hybrid | saltglass-reach | 3/3 |

## Judge panel (per judge, never pooled)

| System | Judge | Items | Errors | Literary mean | Originality mean | accept / revise / reject |
|---|---|---|---|---|---|---|
| mock-faithful | mock-judge-lexical | 3 | 0 | 3.33 | 2.33 | 0 / 0 / 3 |
| mock-faithful | mock-judge-hash | 3 | 0 | 4.33 | 4.67 | 0 / 1 / 2 |
| mock-drift | mock-judge-lexical | 3 | 0 | 4.33 | 3.33 | 0 / 1 / 2 |
| mock-drift | mock-judge-hash | 3 | 0 | 5.67 | 5.33 | 1 / 1 / 1 |
| mock-hybrid | mock-judge-lexical | 3 | 0 | 3.33 | 2.33 | 0 / 0 / 3 |
| mock-hybrid | mock-judge-hash | 3 | 0 | 4.33 | 4.67 | 0 / 1 / 2 |

Panel disagreement (spread ≥ threshold on a 1-10 score, or differing editorial verdicts):

- mock-faithful: 2/3 items flagged; 0 items with a failed judge
- mock-drift: 3/3 items flagged; 0 items with a failed judge
- mock-hybrid: 2/3 items flagged; 0 items with a failed judge

## Latency and cost

| System | p50 latency (ms) | input tok | output tok | token source | USD |
|---|---|---|---|---|---|
| mock-faithful | 0 | 1171 | 4647 | estimate-chars-div-4 | unknown |
| mock-drift | 0 | 1171 | 2343 | estimate-chars-div-4 | unknown |
| mock-hybrid | 0 | 2535 | 4763 | estimate-chars-div-4 | unknown |

