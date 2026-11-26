# Arcanea Narrative Benchmark v0

This benchmark compares three kinds of fiction systems on the same 20 original briefs:

- specialised models (PageStorm served through vLLM)
- frontier APIs (any OpenAI-compatible endpoint)
- a hybrid pipeline that plans with one model and writes with another

It measures consistency, length adherence, lexical diversity, character drift, blind LLM-panel judgements of literary quality, originality and editorial acceptance, and latency and cost.

Status: **v0 harness. No live run has been done yet.** The only results in this repo are a dry run with mock systems and mock judges (`results/example/`). Those numbers test the pipeline and say nothing about any model.

Background and design decisions are in `docs/research/narrative-intelligence/` (README and ADR-004).

## Layout

```
fixtures/            20 JSON briefs + PROVENANCE.md (CC-BY-4.0, original)
lib/                 fixture loader/validator, text utils, receipts, safety gate
scorers/             deterministic scorers, judge interface + rubric, Workers AI judge, mock judges, TASTE bridge
systems/             mock, openai-compatible (frontier or vLLM), hybrid
runner.mjs           CLI
systems.example.json example config (env-var names only, no keys)
results/example/     one tiny committed dry run; every other results/ dir is git-ignored
test/                node --test suite
```

This is plain Node ESM. It needs Node 20 or later and has no dependencies.

## How to run

```bash
# offline: mock systems + mock judges, no network
node benchmarks/narrative-bench/runner.mjs --dry-run

# tests (no network; temp dirs only)
node --test 'benchmarks/narrative-bench/test/*.test.mjs'

# live run
export CLOUDFLARE_ACCOUNT_ID=...  CLOUDFLARE_API_TOKEN=...   # judge panel + safety classifier
export AI_GATEWAY_API_KEY=...                                # or whatever apiKeyEnv your config names
cp benchmarks/narrative-bench/systems.example.json ~/narrative-systems.json   # edit outside the repo
node benchmarks/narrative-bench/runner.mjs --systems ~/narrative-systems.json
```

Options: `--fixtures id1,id2`, `--only-systems a,b`, `--limit N`, `--run-id ID`, `--out DIR`, `--no-judge`, `--no-taste`, `--overwrite`.

Each run writes `results/<runId>/`:

| File | Content |
|---|---|
| `run.json` | Fixture ids, system configs (env-var names only), judge ids, rubric version, blind salt, safety classifier, TASTE availability |
| `results.jsonl` | One row per system × fixture: output text (or a withheld marker), deterministic scores, judge panel result, totals |
| `receipts.jsonl` | One row per generation stage and per judge call: latency, input/output tokens, token source, `usdEstimate` (null when the price is unknown) |
| `summary.md` | Tables per system |

Judge env overrides: `NARRATIVE_BENCH_JUDGE_MODELS` (comma list) and `NARRATIVE_BENCH_AI_GATEWAY` (default `starlight-review`). The judge endpoint is `https://gateway.ai.cloudflare.com/v1/{account}/starlight-review/workers-ai/{model}`.

## Method

Every system gets the same prompt, built from the fixture: brief, world rules, cast, the facts that must hold, and the target length (`lib/fixtures.mjs#buildWritingPrompt`). Probes are never shown to the system.

### Deterministic metrics (`scorers/`)

| Metric | Definition |
|---|---|
| **Facts held** (`mustHold`) | A fact is violated if any of its `contradicts` regexes matches the output. Reported as held/total. |
| **Probes** | Each probe ends in one of three states. *contradicted*: a `contradicts` regex matched, and this wins over everything else. *pass*: an `evidence` regex matched. *not-evidenced*: neither matched, meaning the text is silent or paraphrased. Silence is reported separately and never counted as a contradiction. |
| **Length adherence** | ratio = words / target. Score 1 within ±tolerance (default 0.25). It falls linearly to 0 at ±2×tolerance and stays 0 beyond. |
| **distinct-n** | Unique n-grams / total n-grams, for n = 1, 2, 3 over lowercased word tokens. |
| **Repetition** | Repeated 4-gram rate: the share of 4-gram positions whose 4-gram occurs more than once. Duplicate sentence rate and duplicate paragraph rate. Longest run of identical consecutive sentences: a cheap detector for the repetition spiral Pageshift reports on long generations. |
| **Character drift** | Cast coverage: the share of the cast mentioned. Alias drift: capitalised mid-sentence tokens within edit distance 1 (names of 5 letters or fewer) or 2 (longer names) of a cast name, such as "Marra" for "Mara". Unknown names: capitalised tokens that recur 2 or more times and appear in neither the cast nor the fixture's `knownNames`. |
| **Cross-story continuity** | For the six Saltglass Reach fixtures (`continuityGroup`), a world-scoped fact counts only if it held in *every* story that system wrote. |
| **TASTE bridge** | Reuses `packages/publishing-house/quality` (uniqueness and slop patterns, impact) through its compiled `dist/`. It needs `pnpm --filter @arcanea/publishing-house build`. Without the build it reports `unavailable` and computes no substitute. |

These are lexical smoke checks. They are not reading comprehension. A regex misses paraphrase and can fire on a construction it was not written for. To keep the checks honest, every fixture ships a `violationExample`, a `passExample` and a `failExample`, and the test suite asserts that each check catches its bad example and lets its good example through. The suite also asserts that the stated fact never trips a check. That shows each check behaves on its own examples. It does not prove the check is right on arbitrary prose.

### LLM judge panel (`scorers/judge.mjs`)

Rubric `narrative-bench-rubric-v0`:

- **literary_quality** 1-10: sentence control, specificity, voice, scene construction, working dialogue.
- **originality** 1-10: choices the brief did not require, and avoidance of stock phrasing.
- **editorial**: `accept` (copyedits only), `revise` (worth a round; say what) or `reject` (say why), with 1-4 reasons.

Rules:

- **Blind.** Judges see a salted `b-xxxxxxxxxxxx` id, the brief, the world rules and the text. Before judging, the system id and model names are redacted from the text. Judging runs in a salted shuffled order, so calls are not grouped by system.
- **Two families.** `JudgePanel` refuses a multi-judge panel drawn from a single model family. The default panel is DeepSeek plus OpenAI gpt-oss on Workers AI, set by env or config.
- **Disagreement is reported, never averaged.** Every judge's score is stored. Per item the panel records the min/max/spread per dimension and whether the verdicts were unanimous. An item is flagged when the spread reaches 3 or more (configurable) or the verdicts differ. The summary shows per-judge means side by side and the number of flagged items. No cross-judge average exists anywhere.
- **Failures are recorded.** A judge that errors or returns unparseable output is stored with its error, and the item is marked `complete: false`. Scores are never guessed.

Judge clients are injected: anything with `{id, family, complete({system, user})}` works. The suite ships `WorkersAiJudge` (live) and `MockJudge` (offline; scores derive from the text only and are deliberately not a quality signal).

### Latency and cost

Receipts record latency for each stage. Tokens come from the API `usage` field when it is reported. Otherwise they are estimated as chars/4, and the receipt says so (`tokensSource`). `usdEstimate` is computed only when the config gives a price for that system. Otherwise it is `null`, and the summary prints `unknown`. Hardware cost for local vLLM is not included.

## Safety

**PageStorm models had no safety training and cannot refuse.** Before any person sees their output, it must go through a safety classifier. The harness enforces this:

- A system marked `"unsafeModel": true` will not run unless the config names a `safetyClassifier`. The example config uses Llama Guard on Workers AI.
- The classifier sees at most the first `maxInputChars` characters of each output (default 24000, about 6k tokens). Text past the limit is not classified. Set `"safetyClassifier": { "type": "workers-ai", "maxInputChars": 32000 }` to change it; keep it at or above your longest expected output and within the classifier model's context window. It must be a positive integer, or the run refuses to start.
- If the classifier does not clear an output, the output is withheld from `results.jsonl` (replaced by a marker) and is never sent to the judges. Its deterministic scores are still computed by machine.
- `summary.md` never contains output text.
- A classifier lowers the risk but does not remove it. Treat the raw `results/` directories of PageStorm runs as sensitive and keep them out of the repo. The `.gitignore` already does this.
- Only run PageStorm on a local GPU or on an ephemeral GPU approved per run (ADR-003).

## Fixtures

There are 20 original fixtures under CC-BY-4.0, written for this benchmark (see `fixtures/PROVENANCE.md`):

- 2 fantasy (1 shared-world)
- 2 sci-fi
- 3 mystery (1 shared-world)
- 3 literary (1 shared-world)
- 3 romance-lite (1 shared-world)
- 3 horror-lite (1 shared-world)
- 2 children's
- 2 interactive-fiction branch (1 shared-world)

Six fixtures share the invented Saltglass Reach micro-world, which tests continuity across stories. No Arcanea canon, published book, LongPage or Gutenberg text is used.

## Not measured yet

- **Pageshift-style diagnostics** (ADR-004 v1): LLM evidence extraction plus deterministic pass/fail rules for the seven writing-quality diagnostics. v0 only has lexical probes.
- **Plan-following decay by chapter.** Fixtures are single passages. No multi-chapter generation is scored.
- **Model-chosen-content diversity**: the share of content the prompt did not require, compared across N samples per prompt. v0 diversity is lexical, within one text.
- **The PageStorm scaffold.** `mode: "completions"` sends a plain prompt. It does not drive PageStorm's staged preview → plan → chapter template, so v0 under-represents what that model does with its own scaffold.
- **Continuity-state re-grounding** in the hybrid pipeline (ADR-005). The v0 hybrid is plan then write only.
- **Human editorial judgement and judge calibration.** There is no human-labelled set yet, so judge accuracy is unknown and only disagreement can be shown.
- **Statistical significance.** With 20 fixtures and one sample each, no confidence intervals are computed. Do not rank systems on small differences.
- **Cost of local GPUs, and safety-classifier false negatives.**
