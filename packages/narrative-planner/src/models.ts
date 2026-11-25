/**
 * NarrativeModel: the only thing the planner needs from a language model.
 *
 * Three implementations:
 *  - AiSdkNarrativeModel: wraps an injected Vercel AI SDK `generateText` and
 *    model. No runtime dependency on `ai`.
 *  - PageStormVllmModel: experimental adapter for PageStorm weights served by
 *    vLLM over the OpenAI-compatible /v1/completions route. Refuses to exist
 *    without a SafetyClassifier.
 *  - MockNarrativeModel: deterministic, offline.
 */

import type { StageName } from "./stages.js";

export interface CompletedStageSummary {
  stage: StageName;
  unit: string;
}

export interface GenerateRequest {
  stage: StageName;
  prompt: string;
  completedStages: readonly CompletedStageSummary[];
  maxTokens: number;
  signal?: AbortSignal;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateResult {
  text: string;
  usage: Usage;
  model: string;
  latencyMs: number;
}

export interface NarrativeModel {
  /** Provider label used on cost receipts (e.g. "ai-sdk", "pagestorm-vllm", "mock"). */
  readonly provider: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

// ── Safety ──────────────────────────────────────────────────────────────────

export interface SafetyVerdict {
  allowed: boolean;
  reason?: string;
}

export interface SafetyClassifier {
  check(text: string): SafetyVerdict | Promise<SafetyVerdict>;
}

export class SafetyRefusalError extends Error {
  readonly phase: "prompt" | "output";
  readonly reason: string;
  readonly stage: StageName;
  constructor(phase: "prompt" | "output", stage: StageName, reason: string) {
    super(`safety classifier refused ${phase} for stage ${stage}: ${reason}`);
    this.name = "SafetyRefusalError";
    this.phase = phase;
    this.reason = reason;
    this.stage = stage;
  }
}

function abortError(): Error {
  const e = new Error("aborted");
  e.name = "AbortError";
  return e;
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// ── AI SDK adapter ──────────────────────────────────────────────────────────

/** The subset of AI SDK `generateText` output this adapter reads (v4 and v5 usage shapes). */
export interface AiSdkGenerateTextResult {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  response?: { modelId?: string };
}

export type AiSdkGenerateText = (args: {
  model: unknown;
  prompt: string;
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
}) => Promise<AiSdkGenerateTextResult>;

export interface AiSdkNarrativeModelOptions {
  generateText: AiSdkGenerateText;
  model: unknown;
  /** Model id written to receipts when the SDK response does not carry one. */
  modelId: string;
  provider?: string;
}

export class AiSdkNarrativeModel implements NarrativeModel {
  readonly provider: string;
  private readonly opts: AiSdkNarrativeModelOptions;

  constructor(opts: AiSdkNarrativeModelOptions) {
    if (typeof opts.generateText !== "function") throw new TypeError("generateText must be a function");
    if (!opts.modelId) throw new TypeError("modelId is required");
    this.opts = opts;
    this.provider = opts.provider ?? "ai-sdk";
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (req.signal?.aborted) throw abortError();
    const start = nowMs();
    const res = await this.opts.generateText({
      model: this.opts.model,
      prompt: req.prompt,
      maxOutputTokens: req.maxTokens,
      abortSignal: req.signal,
    });
    const u = res.usage ?? {};
    return {
      text: res.text,
      usage: {
        inputTokens: u.inputTokens ?? u.promptTokens ?? 0,
        outputTokens: u.outputTokens ?? u.completionTokens ?? 0,
      },
      model: res.response?.modelId ?? this.opts.modelId,
      latencyMs: Math.max(0, Math.round(nowMs() - start)),
    };
  }
}

// ── PageStorm via vLLM ──────────────────────────────────────────────────────

export const PAGESTORM_DEFAULT_MODEL = "Pageshift-Entertainment/pagestorm-research-preview-14b-full-book";

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export interface PageStormVllmModelOptions {
  /** Required. PageStorm was trained without safety tuning and cannot refuse. */
  safety: SafetyClassifier;
  /** vLLM server root, e.g. http://127.0.0.1:8000. Falls back to PAGESTORM_BASE_URL. No default. */
  baseUrl?: string;
  model?: string;
  /** Optional bearer token if the vLLM server was started with --api-key. */
  apiKey?: string;
  temperature?: number;
  fetch?: FetchLike;
  env?: Record<string, string | undefined>;
}

export class PageStormVllmModel implements NarrativeModel {
  readonly provider = "pagestorm-vllm";
  readonly baseUrl: string;
  readonly model: string;
  private readonly safety: SafetyClassifier;
  private readonly apiKey: string | undefined;
  private readonly temperature: number | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(opts: PageStormVllmModelOptions) {
    if (!opts || !opts.safety || typeof opts.safety.check !== "function") {
      throw new TypeError(
        "PageStormVllmModel requires a SafetyClassifier ({ check(text) -> { allowed, reason } }). " +
          "The model card states it was trained without safety alignment and cannot refuse.",
      );
    }
    const env = opts.env ?? (typeof process !== "undefined" ? process.env : {});
    const base = opts.baseUrl ?? env["PAGESTORM_BASE_URL"];
    if (!base) {
      throw new TypeError("PageStormVllmModel needs baseUrl or PAGESTORM_BASE_URL; there is no default endpoint.");
    }
    this.baseUrl = base.replace(/\/+$/, "").replace(/\/v1$/, "");
    this.model = opts.model ?? PAGESTORM_DEFAULT_MODEL;
    this.safety = opts.safety;
    this.apiKey = opts.apiKey;
    this.temperature = opts.temperature;
    const f = opts.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);
    if (!f) throw new TypeError("no fetch implementation available");
    this.fetchImpl = f;
  }

  private async classify(phase: "prompt" | "output", stage: StageName, text: string): Promise<void> {
    const verdict = await this.safety.check(text);
    if (!verdict || verdict.allowed !== true) {
      throw new SafetyRefusalError(phase, stage, verdict?.reason ?? "no reason given");
    }
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (req.signal?.aborted) throw abortError();
    await this.classify("prompt", req.stage, req.prompt);
    const body: Record<string, unknown> = {
      model: this.model,
      prompt: req.prompt,
      max_tokens: req.maxTokens,
    };
    if (this.temperature !== undefined) body["temperature"] = this.temperature;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.apiKey) headers["authorization"] = `Bearer ${this.apiKey}`;

    const start = nowMs();
    const res = await this.fetchImpl(`${this.baseUrl}/v1/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: req.signal,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`vLLM /v1/completions returned HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
    }
    const json = (await res.json()) as {
      model?: string;
      choices?: Array<{ text?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.text;
    if (typeof text !== "string") throw new Error("vLLM response had no choices[0].text");
    const latencyMs = Math.max(0, Math.round(nowMs() - start));
    await this.classify("output", req.stage, text);
    return {
      text,
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
      },
      model: json.model ?? this.model,
      latencyMs,
    };
  }
}

// ── Mock ────────────────────────────────────────────────────────────────────

export type MockOverride = string | ((req: GenerateRequest, call: number) => string);

export interface MockNarrativeModelOptions {
  model?: string;
  /** Fixed latency reported on every call. Default 5. */
  latencyMs?: number;
  /** Character names the mock invents. Default: three neutral names. */
  characterNames?: string[];
  /** Per-stage queue of outputs to return before falling back to the default. */
  overrides?: Partial<Record<StageName, MockOverride[]>>;
  /** World rule forbidden terms the mock declares in book_plan. */
  forbiddenTerms?: string[];
}

/**
 * Deterministic offline model. Output depends only on the request, so two runs
 * with the same job produce identical text. Token counts are ceil(chars / 4).
 */
export class MockNarrativeModel implements NarrativeModel {
  readonly provider = "mock";
  readonly calls: GenerateRequest[] = [];
  private readonly opts: Required<Omit<MockNarrativeModelOptions, "overrides">>;
  private readonly overrides: Partial<Record<StageName, MockOverride[]>>;
  private readonly stageCalls = new Map<StageName, number>();

  constructor(opts: MockNarrativeModelOptions = {}) {
    this.opts = {
      model: opts.model ?? "mock-narrative-1",
      latencyMs: opts.latencyMs ?? 5,
      characterNames: opts.characterNames ?? ["Mira Tallow", "Oren Vask", "Sefa Quill"],
      forbiddenTerms: opts.forbiddenTerms ?? ["teleportation"],
    };
    this.overrides = { ...(opts.overrides ?? {}) };
    for (const k of Object.keys(this.overrides) as StageName[]) this.overrides[k] = [...(this.overrides[k] ?? [])];
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (req.signal?.aborted) throw abortError();
    this.calls.push(req);
    const n = (this.stageCalls.get(req.stage) ?? 0) + 1;
    this.stageCalls.set(req.stage, n);
    const queue = this.overrides[req.stage];
    let text: string;
    const next = queue && queue.length > 0 ? queue.shift() : undefined;
    if (next !== undefined) text = typeof next === "function" ? next(req, n) : next;
    else text = this.defaultOutput(req);
    return {
      text,
      usage: { inputTokens: Math.ceil(req.prompt.length / 4), outputTokens: Math.ceil(text.length / 4) },
      model: this.opts.model,
      latencyMs: this.opts.latencyMs,
    };
  }

  private defaultOutput(req: GenerateRequest): string {
    const chapterCount = Number(/CHAPTER_COUNT:\s*(\d+)/.exec(req.prompt)?.[1] ?? "2");
    const chapterIndex = Number(/CHAPTER_INDEX:\s*(\d+)/.exec(req.prompt)?.[1] ?? "1");
    const names = this.opts.characterNames;
    switch (req.stage) {
      case "book_preview":
        return "A lighthouse keeper discovers that the tide carries letters from a city that drowned a century ago.";
      case "book_plan":
        return "```json\n" + JSON.stringify({
          title: "The Drowned Post",
          worldRules: [
            { key: "tide-letters", rule: "Letters arrive only on the spring tide.", forbiddenTerms: this.opts.forbiddenTerms },
            { key: "no-reply", rule: "A letter can never be answered by the same hand twice.", forbiddenTerms: [] },
          ],
          storyArcs: [{ name: "Correspondence", description: "The keeper learns who is writing." }],
          characterArchetypes: [{ archetype: "Seeker", role: "protagonist" }],
          writingStyle: { pov: "third limited", tense: "past", tone: "quiet, salt-worn", notes: "short paragraphs" },
        }) + "\n```";
      case "chapters_plan":
        return JSON.stringify({
          chapters: Array.from({ length: chapterCount }, (_, i) => ({
            index: i + 1,
            name: `Tide ${i + 1}`,
            targetWords: 2500,
            summary: [`Letter ${i + 1} arrives.`, "The keeper hesitates."],
            narrativeFocus: i === 0 ? "setup" : "escalation",
            ruleKeys: ["tide-letters"],
            embeddingSpace: { action: 20, dialog: 30, world_building: 60, exposition: 25, romantic: 10, pacing: 40 + i },
          })),
        });
      case "characters_list":
        return JSON.stringify({
          characters: names.map((name, i) => ({
            name,
            role: i === 0 ? "protagonist" : "supporting",
            description: `${name} keeps a habit nobody else notices.`,
            archetype: i === 0 ? "Seeker" : "Witness",
          })),
        });
      case "scene_breakdown":
        return JSON.stringify({
          chapterIndex,
          scenes: [
            { index: 1, summary: "The tide brings a sealed letter.", characters: [names[0] ?? "Keeper"], location: "the lighthouse", ruleKeys: ["tide-letters"] },
            { index: 2, summary: "A neighbour recognises the handwriting.", characters: names.slice(0, 2), location: "the harbour", ruleKeys: [] },
          ],
        });
      case "chapter_text":
        return `Chapter ${chapterIndex}. The water came up grey and certain, and with it the letter, folded small as a held breath.`;
    }
  }
}
