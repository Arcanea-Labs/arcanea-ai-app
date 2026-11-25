# Narrative intelligence: Pageshift research absorption

Author: Claude Opus 5.5 (Claude Code session for Arcanea Labs), 2026-11-25. Revision 1.
Review state: unreviewed. It needs a sign-off from a different provider through pr-gate.
Paper extraction: Cloudflare Workers AI `@cf/deepseek-ai/deepseek-v4.1-flash-1017` pulled the sections out. Every number below was checked against the paper text before it was written here.

## Sources read

| Source | What it is | Licence | Status |
|---|---|---|---|
| [arXiv 2605.17064](https://arxiv.org/abs/2605.17064), "Towards Human-Level Book-Writing Capability" (Zierstek, Batelic, Medjad, Schönenberger, 2026-05-16) | Dataset construction, training and evaluation | arXiv | Read: sections 1-4, 6 and appendix C. Section 5 (interpretability) only skimmed |
| [pagestorm-research-preview-14b-full-book](https://huggingface.co/Pageshift-Entertainment/pagestorm-research-preview-14b-full-book) | Main model in the paper (Ministral 3 14B Base) | Apache-2.0 | Card read |
| [pagestorm-research-preview-24b-first-chapter-only](https://huggingface.co/Pageshift-Entertainment/pagestorm-research-preview-24b-first-chapter-only) | Older pipe-cleaning model, simpler scaffold, no LongPage | Apache-2.0 | Card read |
| [LongPage](https://huggingface.co/datasets/Pageshift-Entertainment/LongPage) | About 6K Gutenberg novels with synthetic planning traces | CC-BY-4.0 (traces) plus "other" (public-domain book text) | Card read; data not downloaded |
| [Pageshift-ai/pagestorm](https://github.com/Pageshift-ai/pagestorm) | vLLM plugin and CLI, v0.2.0rc1 | **No LICENSE file** | Structure and protocol read; no code used |
| [Training Pagestorm for quality and diversity](https://pageshift.ai/research/pagestorm-diversity) (Oct 2026) | RL diversity method | Blog | Read in full |

## What Pageshift built

**The planning scaffold.** Each public-domain book is summarised top-down (premise, then book plan, then chapter plans, then scenes). Training runs the hierarchy in reverse: from one prompt the model writes a book preview, a book plan, a first-chapter plan, the first chapter, then plans for the remaining chapters, a character list, scene breakdowns and finally the chapter text. Human prose is always the last supervised target. The planning layers exist to make a book-length target learnable.

**Training.**
- Starting point is Ministral 3 14B Base with the vision encoder removed. They chose a base model because assistant post-training pushes against deception, moral ambiguity and unreliable narration, which fiction needs.
- Plain SFT with cross-entropy, loss masked only on the prompt, sequences up to 262,144 tokens.
- Trained to "hyperconvergence", meaning the model emits low-entropy continuations that stay consistent with the template.
- They report better convergence from stochastic bfloat16 downcasting scaled by the learning rate.
- JAX on a TPU v6e-256 with the Muon optimizer and Ring Attention.
- Decoding is regex-constrained, but the constraint covers structure only, never content.

**Evaluation.**
- 360 prompts written for the study: 36 families × 10 variations, 240 original fiction and 120 fanfiction.
- Seven writing-quality diagnostics. An LLM extracts structured evidence (Gemma4 31B in appendix C), then deterministic rules decide pass or fail. The authors argue that LLM-as-judge scoring is not good enough for creative writing.
  - The seven: setup becomes a live problem; the same goal stays active; a blocked goal triggers a response; the mystery stays unresolved; the initial situation is clear; viewpoint control holds; exposition is motivated by local need.
- Headline: PageStorm beats GPT-5.5 on all seven diagnostics and has the top score on four. Claude Opus 4.8 beats it on three (same goal stays active, initial situation is clear, viewpoint control holds). On "mystery remains unresolved", both frontier baselines score under 8% and PageStorm scores 32.2%.
- Prompt and scaffold following, original fiction: prompt to preview 93.7%, preview to plan 54.2%, plan to first chapter 39.2%. Fanfiction: 86.0%, 28.1%, 31.1%.
- Plan-following by chapter starts at 73.1% for chapter 1 and ends at 50.8% for the last chapter evaluated. The range across later chapters is 37.2% to 65.5%.

**Limitations the authors state.** Adherence to the prompt and the scaffold weakens in later stages. Long generations eventually fall into a repetition spiral they can't recover from, so full books at the 256K context are not yet reliable. Fanfiction transfers weakly.

**The diversity method (blog, October 2026).**
- RL with GRPO on the book-preview stage only, with these rewards:
  - A quality reward model scores prompt adherence and basic readability.
  - A diversity reward is computed across a group of responses to the same prompt.
- How the diversity reward works:
  - An LLM first separates content the prompt required from content the model chose. Only the chosen content is scored.
  - The chosen content is embedded, and semantic local density is measured within the group with cosine similarity.
  - A similarity cutoff stops pushing ideas apart once they differ enough.
- The new parameters are latent adapters (two small MLPs per layer, base model frozen). Gains on the preview carried over, more weakly, to later stages.
- Evaluation: 360 prompts × 16 previews.

## What Arcanea takes from this

| Idea | Decision | Where |
|---|---|---|
| Staged prompt → preview → plan → chapter plan → scene → text | **Reimplement clean-room** as a model-independent planner | `packages/narrative-planner` |
| Structure-only constrained decoding | **Reimplement** with hand-written JSON validators per stage | `packages/narrative-planner` |
| PageStorm 14B weights | **Use as an optional provider** over an OpenAI-compatible vLLM endpoint, behind a mandatory safety classifier | `PageStormVllmModel` |
| pagestorm Python package | **Do not use or vendor** (no licence) | none |
| LongPage traces | **Learn the schema; do not redistribute; no fixtures from it.** Gutenberg IDs were stripped, so per-book provenance and public-domain status outside the US can't be checked | ADR-001 |
| Extraction plus deterministic-rule diagnostics | **Adopt the method** with our own extraction prompts and rules; this is the core of benchmark v1 | `benchmarks/narrative-bench` |
| Prompt-required vs model-chosen diversity | **Adopt as a metric** (inference-time selection among N candidates). No RL training, since we don't train models | `world-engine/continuity` + bench |
| Plan-following decays by chapter | **Improve it**: re-ground every chapter in an explicit continuity state (character ledger, timeline, world rules) instead of relying on attention to a 256K prefix | `world-engine/continuity` |

Where Arcanea can go further than the paper: their stated weak point is long-range consistency. Arcanea already holds structured canon (Guardians, Gates, Elements, Houses) in `world-engine`. Re-injecting a computed continuity state per chapter, and checking each chapter against it, targets exactly the failure the authors name. That is a hypothesis until benchmark v1 measures it.

## Complementary research (reading queue, not yet read in this pass)

- Hierarchical story generation and planning: Fan et al. 2018 (WritingPrompts); Yao et al. 2019 (Plan-and-Write); Yang et al. 2022 (Re3) and 2023 (DOC); Mirowski et al. 2023 (Dramatron).
- Long output: Bai et al. 2024 (LongWriter).
- Character simulation: Park et al. 2023 (Generative Agents).
- Fiction similarity: FicSim, [arXiv 2510.20926](https://arxiv.org/abs/2510.20926).
- Interactive fiction and transmedia: open.

## Productization map (proposal)

| Capability | Form | Visibility |
|---|---|---|
| Staged planner, continuity checks, diversity metrics | Open-source library (`@arcanea/narrative-planner`, world-engine continuity) | Public |
| Plan / check-continuity / score-diversity | MCP tools on `@arcanea/mcp-server` | Public |
| Narrative benchmark fixtures and harness | Open benchmark (CC-BY-4.0 fixtures) | Public |
| PageStorm runs, judge panels, result history | Private research infrastructure | Private |
| Guided universe-to-book writing | Paid creator experience in arcanea.ai, after a gate PASS (waitlist first) | Product, human-gated |
| Generated Arcanea fiction | Candidate entertainment assets; canon promotion only with a human approval record | Human-gated |
