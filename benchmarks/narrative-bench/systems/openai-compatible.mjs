// Any OpenAI-compatible endpoint: frontier APIs behind a compatible gateway,
// or PageStorm served by vLLM (`vllm serve ... --port 8000` exposes /v1).
//
// Config:
//   { type: "openai-compatible", id, baseUrl, model, apiKeyEnv?, mode?: "chat"|"completions",
//     maxTokens?, temperature?, pricing?: {inputPerMTok, outputPerMTok, source}, unsafeModel? }
// The key is read from process.env[apiKeyEnv] at call time; configs hold only the env name.
import { stageReceipt } from '../lib/receipts.mjs';

export class OpenAICompatibleClient {
  constructor(cfg, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
    if (!cfg.baseUrl || !cfg.model) throw new Error(`system ${cfg.id}: baseUrl and model are required`);
    this.cfg = { mode: 'chat', maxTokens: 4096, temperature: 0.8, timeoutMs: 600000, ...cfg };
    // env and fetch stay non-enumerable so secrets never serialise into run.json or logs.
    Object.defineProperty(this, 'env', { value: env, enumerable: false });
    Object.defineProperty(this, '_fetch', { value: fetchImpl, enumerable: false });
  }

  async complete({ system, user }, { stage = 'write', maxTokens } = {}) {
    const c = this.cfg;
    const key = c.apiKeyEnv ? this.env[c.apiKeyEnv] : undefined;
    if (c.apiKeyEnv && !key) throw new Error(`system ${c.id}: env ${c.apiKeyEnv} is not set`);
    const base = c.baseUrl.replace(/\/+$/, '');
    const chat = c.mode !== 'completions';
    const body = chat
      ? { model: c.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens ?? c.maxTokens, temperature: c.temperature }
      : { model: c.model, prompt: `${system}\n\n${user}\n\n`, max_tokens: maxTokens ?? c.maxTokens, temperature: c.temperature };
    const t0 = Date.now();
    const res = await this._fetch(`${base}/${chat ? 'chat/completions' : 'completions'}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(c.timeoutMs),
    });
    const raw = await res.text();
    const latencyMs = Date.now() - t0;
    if (!res.ok) throw new Error(`system ${c.id}: HTTP ${res.status}: ${raw.slice(0, 200)}`);
    const json = JSON.parse(raw);
    const choice = json.choices?.[0];
    const text = chat ? choice?.message?.content : choice?.text;
    if (typeof text !== 'string') throw new Error(`system ${c.id}: response had no text`);
    const usage = json.usage ? { inputTokens: json.usage.prompt_tokens, outputTokens: json.usage.completion_tokens } : null;
    return { text, receipt: stageReceipt({ stage, model: c.model, latencyMs, usage, promptText: system + user, outputText: text, pricing: c.pricing }) };
  }
}

export class OpenAICompatibleSystem {
  constructor(cfg, deps) {
    this.id = cfg.id;
    this.client = new OpenAICompatibleClient(cfg, deps);
    this.unsafeModel = !!cfg.unsafeModel;
    this.markers = [cfg.id, cfg.model, ...(cfg.model.includes('/') ? cfg.model.split('/') : [])];
  }
  async generate(fixture, { buildWritingPrompt }) {
    const { text, receipt } = await this.client.complete(buildWritingPrompt(fixture));
    return { text, stages: [receipt] };
  }
}
