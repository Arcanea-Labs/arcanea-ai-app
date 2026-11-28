# @arcanea/narrative-diagnostics

Narrative-quality diagnostics for book previews and chapter openings, built as **extraction plus deterministic rules**:

1. **Extraction.** An `Extractor` reads a text window and returns typed JSON evidence: participants, goals, questions, viewpoint spans and so on. Each item carries a stable `id` and a 1-indexed `paragraph`. The output is validated against a strict JSON schema, with no extra keys and integer paragraphs ≥ 1. Invalid JSON or a schema violation triggers exactly one retry that sends the errors back. A second failure throws `ExtractionError`.
2. **Scoring.** Pure functions turn validated evidence into `{ pass, failedGate, selectedEvidence, counts }`. Scorers make no model calls, so the same evidence always gives the same verdict. Items are deduped by `id` (first occurrence wins). Paragraph windows are enforced here, not trusted from the model.

The model is told to record what is on the page and never to grade. The verdict belongs to the rules.

## Credit

The evaluation idea (LLM evidence extraction followed by deterministic pass/fail rules, in place of LLM-as-judge scoring for creative writing) comes from Pageshift Entertainment's paper, *Towards Human-Level Book-Writing Capability*, [arXiv 2605.17064](https://arxiv.org/abs/2605.17064). This package is our own implementation, written from a description of the method. The extraction prompts, schemas, rules, thresholds and fixtures are ours. No prompt or text from the paper is used. See `docs/research/narrative-intelligence/` (ADR-004) for how it fits into the Arcanea benchmark.

## Diagnostics

Windows are paragraph ranges of the chapter opening, inclusive.

| id | Inputs | Gates, in order |
|---|---|---|
| `setup_live_problem` | preview + chapter | `preview_participant` → `preview_pressure` (obstacle, cost, risk, rule, refusal, scarcity) → `preview_direction` (goal, need, obligation, question, mission) → `chapter_window` (in ¶1-12: an open question or information gap, plus an exchange, plus an active constraint) → `comparison_link` (ties a preview **pressure or direction** item to an existing window; a participant alone never counts) |
| `same_goal_active` | chapter | `goal_frame` (in ¶1-4: owner, motivation, ≥1 constraint/obstacle/attempt) → `continuation_link` (activity in ¶5-12: substantive, text-supported, actor is the owner or an ally) → `paragraph_spread` (≥3 distinct paragraph indices across goal, motivation, support and links, with ≥1 index ≥5) |
| `blocked_goal_response` | preview + chapter | `preview_blocked_goal` (actor, goal and blocker all present) → `chapter_goal` (¶1-4) → `active_response` (¶1-4) → `response_order` (some response at or after some goal) |
| `mystery_unresolved` | chapter | `concrete_question` (¶1-12) → `keeps_active` (a later activity tied to it) → `major` (story problem, goal, stakes, world rule, antagonist, identity/relationship, causal secret) → `focal` (story problem, goal, stakes, world rule) → `timely_follow_up` (an activity within the next 3 paragraphs, capped at ¶12) → `unresolved` (not answered by ¶12) |
| `initial_situation_clear` | chapter | For participant, strong context and current activity (each due by ¶4), then relevance (due by ¶6): `missing_<kind>` if the anchor is absent, `late_<kind>` if it appears only after its deadline |
| `viewpoint_control` | chapter | `no_spans` → `coverage` (covered paragraphs ≥ min(6, opening length)) → `unclear_share` (unclear or mixed spans ≤ 0.3 of spans) → `unsignalled_shift` (a span that enters more than one character's interiority needs a shift signal) |
| `exposition_local_need` | chapter | `motivated_share`: the share of exposition passages in ¶1-12 tied to a question, decision or obstacle in the same or an adjacent paragraph must be ≥ `threshold`. **The default of 0.5 is ours, not the paper's.** |
| `plan_following` | per chapter: text + plan bullets | The extractor marks each bullet `realized`, `partial`, `missing` or `contradicted`. The score is `1 + round(6 × coverage)`, where realized = 1, partial = 0.5 and the others = 0. It maps linearly to a percentage (1 = 0%, 7 = 100%). The output is a per-chapter `curve` with `firstPct`, `lastPct` and `decayPct`. The run fails at `chapter_below_threshold` (default 50%, also ours) |

## Usage

```ts
import { WorkersAiExtractor, runDiagnostic, runAll, runPlanFollowing } from '@arcanea/narrative-diagnostics';

// Reads CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN from the map you pass. Nothing is read implicitly.
const extractor = WorkersAiExtractor.fromEnv(process.env);

const one = await runDiagnostic(extractor, 'mystery_unresolved', { chapter });
const all = await runAll(extractor, { preview, chapter }); // skips diagnostics whose inputs are missing
const plan = await runPlanFollowing(extractor, [{ chapter: 1, text, planBullets }]);
```

`WorkersAiExtractor` sends a POST to `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{model}` with `Authorization: Bearer …` and `cf-aig-gateway-id: starlight-review`. The default model is `@cf/deepseek-ai/deepseek-v4.1-flash-1017`, `max_tokens` is never below 16000, and temperature is 0. The response reader accepts both the `result.response` and `result.choices[0].message.content` envelopes. `MockExtractor` replays queued responses for tests and offline runs. Any object with `name` and `run({system, user, maxTokens}) → Promise<string>` can serve as an extractor.

The scorers (`scoreSetupLiveProblem`, `scoreSameGoalActive`, …, `scoreChapterPlan`, `scorePlanCurve`) are exported for use on evidence you already hold.

## Differences from the paper

- **Prompts, schemas and rules are ours.** We wrote them from the method description. Gate names, field names and the exact rule boundaries are our own, so scores are **not comparable** with the paper's published numbers.
- **Extractor model.** The paper's appendix names Gemma4 31B as its extractor. Our default is DeepSeek V4.1 Flash on Workers AI, and the extractor can be swapped.
- **Thresholds we chose:** exposition share 0.5; plan-following pass line 50%; unclear viewpoint share counted **per span** rather than per paragraph; "no exposition at all" **passes** because nothing is unmotivated.
- **Plan-following score is deterministic.** We extract a per-bullet status and compute the 1-7 score from coverage, instead of asking a model for a 1-7 rating. The 1-7 to percentage mapping is linear, as the task specifies.
- **Paragraph windows are enforced in code.** Evidence outside a window is dropped, not trusted.
- **Single extraction, no ensembling.** One extraction per diagnostic (per chapter for plan following) with one schema-repair retry. We do not do majority voting or run multiple extractors.
- `same_goal_active`'s "≥1 index ≥5" condition is always met once a valid link exists, because links must sit in ¶5-12. We keep it inside the `paragraph_spread` gate for fidelity.

## Development

```bash
pnpm --filter @arcanea/narrative-diagnostics test   # tsc build, then node --test tests/*.test.mjs
```

The package has no runtime dependencies and the tests make no network calls. Fixtures in `tests/fixtures.mjs` are original, handwritten evidence about an invented scene (CC-BY-4.0, Arcanea).
