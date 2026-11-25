# @arcanea/narrative-planner

A model-independent, hierarchical narrative planner. It drives any language model through a fixed stage protocol, from a one-line premise to chapter prose:

```
book_preview → book_plan → chapters_plan → characters_list → (scene_breakdown → chapter_text) × N chapters
```

Each structured stage is JSON, checked by a hand-written validator. Runs are resumable, every model call writes a cost receipt, and a deterministic canon gate reviews every stage result. Status: experimental, research slice (see `docs/research/narrative-intelligence/`).

## What is in the box

| Module | What it does |
|---|---|
| `stages` | Stage types, `extractJson` (fenced or bare JSON), one validator per structured stage, `parseStage` |
| `models` | `NarrativeModel` interface; `AiSdkNarrativeModel`, `PageStormVllmModel` (experimental), `MockNarrativeModel` |
| `runner` | `runStory(jobSpec)` async iterator of events, `resume(jobId, opts)`, `collect()` |
| `checkpoint` | `CheckpointStore`; `MemoryCheckpointStore`, `FileCheckpointStore(dir)` |
| `receipts` | `CostReceipt`, injected pricing (per-token or GPU wallclock), JSONL round trip, `totalCost` |
| `canon-gate` | `CanonGate` interface and `StructuralCanonGate` |
| `prompts` | Default prompt builder (replaceable via `jobSpec.promptBuilder`) |

### Stage schemas

- `book_plan`: `title`, `worldRules[{key, rule, forbiddenTerms[]}]`, `storyArcs[{name, description}]`, `characterArchetypes[{archetype, role}]`, `writingStyle{pov, tense, tone, notes}`.
- `chapters_plan`: `chapters[{index, name, targetWords, summary[], narrativeFocus, ruleKeys[], embeddingSpace{action, dialog, world_building, exposition, romantic, pacing}}]`. Each axis is an integer from 0 to 100.
- `characters_list`: `characters[{name, role, description, archetype}]`.
- `scene_breakdown` (per chapter): `chapterIndex`, `scenes[{index, summary, characters[], location, ruleKeys[]}]`.
- `book_preview` and `chapter_text` are prose. `chapter_text` may cite a rule inline as `[rule:key]`.

### Run semantics

- A unit is one stage for the book, or one chapter-level stage for one chapter. The checkpoint is saved after every completed unit, and also when a run stops (abort or error), so receipts are never lost.
- `resume(jobId, opts)` reloads premise and chapter count from the checkpoint and skips finished units without calling the model.
- An `AbortSignal` stops the run before the next unit, or during a model call if the model honours the signal.
- A validation failure is retried (default 3 attempts), and the validator errors are fed back into the prompt. When the attempts run out, the run emits `error` with code `validation_exhausted` and stops.
- Other stop codes: `canon_block`, `safety_refusal` (never retried), `model_error`, `job_mismatch` (same jobId, different premise).

### Cost receipts

One receipt per model call, including attempts that failed validation: `{jobId, stage, unit, model, provider, inputTokens, outputTokens, latencyMs, usdEstimate, pricingSource, ts}`.

- This package ships no prices. Pass a `PricingTable` keyed by model id: `{kind: "tokens", usdPerMillionInput, usdPerMillionOutput, source}` or `{kind: "gpu", gpuHourlyUsd, source}`. GPU cost is `gpuHourlyUsd × wallclock`.
- If the model has no price, the receipt gets `usdEstimate: null` and `pricingSource: "unknown"`.
- `totalCost` returns `pricedUsd`, plus `unpricedCount` and `complete`. If any receipt is unpriced, `pricedUsd` is a lower bound, not a total.

### Canon gate

`StructuralCanonGate` is a pure function, with no model calls:

| Check | Verdict |
|---|---|
| A `forbiddenTerms` entry from a `book_plan` world rule appears in a later stage | `block` (run stops, unit not checkpointed) |
| A chapter, scene or `[rule:key]` cites a rule key `book_plan` did not declare | `flag` |
| A scene uses a character not in `characters_list` | `flag` |
| A generated character uses a reserved canon name (Guardians and Godbeasts from `packages/world-engine/src/canon.ts`) | `flag` |

The reserved-name list is mirrored, not imported, so the package has no workspace dependencies. A test reads `canon.ts` and fails if the two lists drift apart.

Every stage result has `status: "candidate"`. Nothing in this package writes to `.arcanea/lore`, and no output is canon. Promotion requires a human approval record (ADR-002).

## Usage

```js
import { runStory, MockNarrativeModel, FileCheckpointStore, StructuralCanonGate } from "@arcanea/narrative-planner";

for await (const ev of runStory({
  jobId: "demo-1",
  premise: "A lighthouse keeper receives letters from a drowned city.",
  chapterCount: 3,
  model: new MockNarrativeModel(),
  store: new FileCheckpointStore("./.runs"),
  canonGate: new StructuralCanonGate(),
})) {
  console.log(ev.type, ev.stage ?? "", ev.unit ?? "");
}
```

With the Vercel AI SDK, inject both `generateText` and the model, so this package never imports `ai`:

```js
import { generateText } from "ai";
const model = new AiSdkNarrativeModel({ generateText, model: gateway("some/model"), modelId: "some/model" });
```

## PageStorm (experimental)

`PageStormVllmModel` calls PageStorm weights served by vLLM through the OpenAI-compatible `POST /v1/completions` route. The default model id is `Pageshift-Entertainment/pagestorm-research-preview-14b-full-book`.

**Safety requirement.** The model card says the model was trained without safety alignment and cannot refuse. The constructor throws unless you pass a `SafetyClassifier` (`{ check(text) → { allowed, reason } }`, sync or async). The adapter classifies the prompt before sending it and every output before returning it. A refusal throws `SafetyRefusalError`, and the runner turns that into a `safety_refusal` stop. This package does not provide a classifier; choosing one is the caller's responsibility.

**Running against a local vLLM.** Requires a GPU with enough memory for a 14B model; check the vLLM docs for your hardware.

```bash
vllm serve Pageshift-Entertainment/pagestorm-research-preview-14b-full-book --port 8000
export PAGESTORM_BASE_URL=http://127.0.0.1:8000   # no default; nothing is called unless you set this
```

```js
const model = new PageStormVllmModel({ safety: myClassifier });       // reads PAGESTORM_BASE_URL
// or: new PageStormVllmModel({ safety: myClassifier, baseUrl: "http://127.0.0.1:8000", apiKey, temperature })
```

Pass a `{kind: "gpu", gpuHourlyUsd, source}` price for the model id if you want wallclock cost estimates. Without one, receipts record `unknown`.

**Prompt quality on PageStorm is unmeasured.** PageStorm was trained on Pageshift's own planning template, which was not reproduced here (its code is unlicensed, see below). The default prompts are generic instruction prompts. Expect weaker stage adherence than the paper reports until someone evaluates this. This package makes no quality claim.

## Licence facts

- PageStorm model weights: Apache-2.0, per their Hugging Face model cards. Calling them as a provider is permitted.
- `github.com/Pageshift-ai/pagestorm` (the vLLM plugin and CLI) has no LICENSE file, so all rights are reserved. None of its code is used, copied or vendored. The stage protocol here is a clean-room implementation, written from the paper's description and the model cards.
- LongPage dataset: the planning traces are CC-BY-4.0 and the book text is public-domain Gutenberg text (licence "other"). Nothing from LongPage is redistributed, trained on or used as a fixture. If its schema ideas are reused, credit goes to Pageshift Entertainment under CC-BY-4.0.

## Development

From the repo root (no install needed; the package has no dependencies):

```bash
tsc -p packages/narrative-planner/tsconfig.json
node --test packages/narrative-planner/tests/*.test.mjs
```

Tests use only the mock model and an injected `fetch`, so they make no network calls.

## Known gaps

- No receipt is written when a model call throws (no usage is reported), including a safety refusal on output. The tokens spent on that call are not counted.
- Stage order is fixed. The paper's variant (first chapter written before the remaining chapter plans) is not implemented.
- The canon gate is lexical. It does not catch paraphrased forbidden concepts or near-miss names.
