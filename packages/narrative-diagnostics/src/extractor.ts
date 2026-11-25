import type { JsonSchema, PromptPair } from './types.js';
import { validate } from './validate.js';

/** A single extraction call: prompt in, raw model text out. */
export interface ExtractionRequest extends PromptPair {
  maxTokens: number;
}

/**
 * The extraction layer's only dependency. Implementations turn a prompt into
 * raw text; parsing, schema validation and the retry live in extractEvidence,
 * so every implementation gets the same strictness.
 */
export interface Extractor {
  readonly name: string;
  run(request: ExtractionRequest): Promise<string>;
}

export class ExtractionError extends Error {
  readonly attempts: ReadonlyArray<{ raw: string; errors: string[] }>;
  constructor(message: string, attempts: ReadonlyArray<{ raw: string; errors: string[] }>) {
    super(message);
    this.name = 'ExtractionError';
    this.attempts = attempts;
  }
}

export interface ExtractionOutcome<T> {
  evidence: T;
  /** 1 when the first answer was valid, 2 when the retry was needed. */
  attempts: number;
}

export const DEFAULT_MAX_TOKENS = 16000;

/**
 * Parse model text into JSON. Tolerates <think> blocks, code fences and
 * prose around one top-level object; anything else is a parse failure.
 */
export function parseModelJson(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1] !== undefined) text = fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return { ok: false, error: 'no JSON object found in output' };
  try {
    return { ok: true, value: JSON.parse(text.slice(start, end + 1)) };
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
}

/**
 * Run one extraction with strict schema validation and exactly one retry.
 * The retry repeats the request with the validation errors appended.
 * Throws ExtractionError when both attempts fail.
 */
export async function extractEvidence<T>(
  extractor: Extractor,
  prompt: PromptPair,
  schema: JsonSchema,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<ExtractionOutcome<T>> {
  const attempts: Array<{ raw: string; errors: string[] }> = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const user =
      attempt === 1
        ? prompt.user
        : `${prompt.user}\n\n=== CORRECTION ===\nYour previous answer was rejected:\n${(attempts[0]?.errors ?? [])
            .slice(0, 20)
            .map((e) => `- ${e}`)
            .join('\n')}\nAnswer again with one JSON object that matches the schema exactly.`;
    const raw = await extractor.run({ system: prompt.system, user, maxTokens });
    const parsed = parseModelJson(raw);
    const errors = parsed.ok ? validate(parsed.value, schema) : [parsed.error];
    if (parsed.ok && errors.length === 0) return { evidence: parsed.value as T, attempts: attempt };
    attempts.push({ raw, errors });
  }
  throw new ExtractionError(`extraction failed schema validation after 2 attempts (${extractor.name})`, attempts);
}

/* ------------------------------------------------------------------ */
/* MockExtractor                                                       */
/* ------------------------------------------------------------------ */

export type MockResponse = string | object | ((request: ExtractionRequest) => string | object);

/**
 * Deterministic extractor for tests and offline runs. Responses are consumed
 * in order; objects are serialised to JSON, strings are returned as-is (so a
 * test can feed broken JSON). It records every request it received.
 */
export class MockExtractor implements Extractor {
  readonly name = 'mock';
  readonly requests: ExtractionRequest[] = [];
  private readonly queue: MockResponse[];

  constructor(responses: MockResponse[]) {
    this.queue = [...responses];
  }

  async run(request: ExtractionRequest): Promise<string> {
    this.requests.push(request);
    const next = this.queue.shift();
    if (next === undefined) throw new Error('MockExtractor: no response queued');
    const value = typeof next === 'function' ? next(request) : next;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}

/* ------------------------------------------------------------------ */
/* WorkersAiExtractor                                                  */
/* ------------------------------------------------------------------ */

/** The slice of fetch this package uses, so no DOM or Node typings are needed. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface WorkersAiConfig {
  accountId: string;
  apiToken: string;
  /** Defaults to DEFAULT_WORKERS_AI_MODEL. */
  model?: string;
  /** AI Gateway id sent as cf-aig-gateway-id. Defaults to "starlight-review". */
  gatewayId?: string;
  /** Floor for max_tokens; requests below it are raised to it. Defaults to 16000. */
  minMaxTokens?: number;
  /** Injected for tests; defaults to globalThis.fetch. */
  fetch?: FetchLike;
}

export const DEFAULT_WORKERS_AI_MODEL = '@cf/deepseek-ai/deepseek-v4.1-flash-1017';
export const DEFAULT_GATEWAY_ID = 'starlight-review';

/**
 * Calls Cloudflare Workers AI:
 *   POST https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{model}
 * Credentials come from the caller (see fromEnv); nothing is read implicitly.
 */
export class WorkersAiExtractor implements Extractor {
  readonly name: string;
  private readonly config: Required<Omit<WorkersAiConfig, 'fetch'>> & { fetch: FetchLike };

  constructor(config: WorkersAiConfig) {
    if (!config.accountId) throw new Error('WorkersAiExtractor: accountId is required');
    if (!config.apiToken) throw new Error('WorkersAiExtractor: apiToken is required');
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    const fetchImpl = config.fetch ?? globalFetch;
    if (!fetchImpl) throw new Error('WorkersAiExtractor: no fetch implementation available');
    this.config = {
      accountId: config.accountId,
      apiToken: config.apiToken,
      model: config.model ?? DEFAULT_WORKERS_AI_MODEL,
      gatewayId: config.gatewayId ?? DEFAULT_GATEWAY_ID,
      minMaxTokens: config.minMaxTokens ?? DEFAULT_MAX_TOKENS,
      fetch: fetchImpl,
    };
    this.name = `workers-ai:${this.config.model}`;
  }

  /** Build from an env map such as process.env. Throws when a variable is missing. */
  static fromEnv(env: Record<string, string | undefined>, overrides: Partial<WorkersAiConfig> = {}): WorkersAiExtractor {
    return new WorkersAiExtractor({
      accountId: env.CLOUDFLARE_ACCOUNT_ID ?? '',
      apiToken: env.CLOUDFLARE_API_TOKEN ?? '',
      ...overrides,
    });
  }

  get endpoint(): string {
    return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.config.accountId)}/ai/run/${this.config.model}`;
  }

  async run(request: ExtractionRequest): Promise<string> {
    const body = {
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      max_tokens: Math.max(request.maxTokens, this.config.minMaxTokens),
      temperature: 0,
    };
    const res = await this.config.fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        'cf-aig-gateway-id': this.config.gatewayId,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Workers AI HTTP ${res.status}: ${text.slice(0, 300)}`);
    return readWorkersAiText(text);
  }
}

/**
 * Pull the generated text out of a Workers AI envelope. Handles the classic
 * `{result:{response}}` shape (string or already-parsed object) and the
 * OpenAI-style `{result:{choices:[{message:{content}}]}}` shape.
 */
export function readWorkersAiText(envelopeText: string): string {
  let envelope: unknown;
  try {
    envelope = JSON.parse(envelopeText);
  } catch {
    throw new Error('Workers AI returned a non-JSON envelope');
  }
  const result = (envelope as { result?: unknown }).result as
    | { response?: unknown; choices?: Array<{ message?: { content?: unknown } }> }
    | undefined;
  if (result === undefined || result === null) throw new Error('Workers AI envelope has no result');
  if (typeof result.response === 'string') return result.response;
  if (result.response !== undefined && typeof result.response === 'object') return JSON.stringify(result.response);
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  throw new Error('Workers AI envelope has no response text');
}
