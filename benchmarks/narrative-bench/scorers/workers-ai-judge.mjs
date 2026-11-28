// Judge client for Cloudflare Workers AI through AI Gateway (REST).
//   POST https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/workers-ai/{model}
// Credentials come from the environment at runtime and are never logged or
// written to receipts.

export const DEFAULT_GATEWAY = 'starlight-review';
export const DEFAULT_JUDGE_MODELS = ['@cf/deepseek-ai/deepseek-v4.1-flash-1017', '@cf/openai/gpt-oss-120b'];

/** "@cf/openai/gpt-oss-120b" -> "openai"; used to enforce a mixed-family panel. */
export function modelFamily(model) {
  const m = /^@cf\/([^/]+)\//.exec(model);
  return m ? m[1] : model.split('/')[0];
}

export function gatewayUrl(accountId, gateway, model) {
  return `https://gateway.ai.cloudflare.com/v1/${encodeURIComponent(accountId)}/${encodeURIComponent(gateway)}/workers-ai/${model}`;
}

/** Pulls text out of the response shapes Workers AI returns. */
export function extractWorkersAiText(body) {
  const r = body?.result ?? body;
  if (typeof r?.response === 'string') return r.response;
  if (r?.response && typeof r.response === 'object') return JSON.stringify(r.response);
  const choice = r?.choices?.[0];
  if (typeof choice?.message?.content === 'string') return choice.message.content;
  if (typeof choice?.text === 'string') return choice.text;
  if (Array.isArray(r?.output)) {
    const parts = r.output.flatMap((o) => o?.content ?? []).filter((c) => typeof c?.text === 'string');
    if (parts.length) return parts.map((c) => c.text).join('');
  }
  throw new Error('unrecognised Workers AI response shape');
}

function extractUsage(body) {
  const u = body?.result?.usage ?? body?.usage;
  if (!u) return null;
  const inputTokens = u.prompt_tokens ?? u.input_tokens ?? null;
  const outputTokens = u.completion_tokens ?? u.output_tokens ?? null;
  return inputTokens === null && outputTokens === null ? null : { inputTokens, outputTokens };
}

export class WorkersAiJudge {
  constructor({ accountId, apiToken, model, gateway = DEFAULT_GATEWAY, fetchImpl = globalThis.fetch, maxTokens = 800, timeoutMs = 120000 }) {
    if (!accountId) throw new Error('WorkersAiJudge: CLOUDFLARE_ACCOUNT_ID missing');
    if (!apiToken) throw new Error('WorkersAiJudge: CLOUDFLARE_API_TOKEN missing');
    if (!model) throw new Error('WorkersAiJudge: model missing');
    this.model = model;
    this.id = `workers-ai:${model}`;
    this.family = modelFamily(model);
    this.url = gatewayUrl(accountId, gateway, model);
    this.maxTokens = maxTokens;
    this.timeoutMs = timeoutMs;
    // Keep the token off enumerable fields so it never lands in JSON output.
    Object.defineProperty(this, '_token', { value: apiToken, enumerable: false });
    Object.defineProperty(this, '_fetch', { value: fetchImpl, enumerable: false });
  }

  async complete({ system, user }) {
    const t0 = Date.now();
    const res = await this._fetch(this.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this._token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: this.maxTokens,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`Workers AI ${this.model} HTTP ${res.status}: ${raw.slice(0, 200)}`);
    const body = JSON.parse(raw);
    if (body?.success === false) throw new Error(`Workers AI ${this.model} error: ${JSON.stringify(body.errors ?? []).slice(0, 200)}`);
    return { text: extractWorkersAiText(body), usage: extractUsage(body), latencyMs: Date.now() - t0 };
  }
}

/**
 * Builds the default two-family panel from env.
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN       required
 *   NARRATIVE_BENCH_JUDGE_MODELS                      comma list, default DEFAULT_JUDGE_MODELS
 *   NARRATIVE_BENCH_AI_GATEWAY                        default "starlight-review"
 */
export function workersAiJudgesFromEnv(env = process.env, { fetchImpl } = {}) {
  const models = (env.NARRATIVE_BENCH_JUDGE_MODELS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return (models.length ? models : DEFAULT_JUDGE_MODELS).map(
    (model) =>
      new WorkersAiJudge({
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: env.CLOUDFLARE_API_TOKEN,
        gateway: env.NARRATIVE_BENCH_AI_GATEWAY || DEFAULT_GATEWAY,
        model,
        ...(fetchImpl ? { fetchImpl } : {}),
      })
  );
}
