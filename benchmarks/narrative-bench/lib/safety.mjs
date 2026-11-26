// Safety classifier gate. PageStorm (and any base model without safety
// training) must not have its output read by a person, or stored in clear
// text, until a classifier has looked at it.
//
// Classifier interface: { id, async classify(text) -> { safe: boolean, label: string } }
import { gatewayUrl, extractWorkersAiText, DEFAULT_GATEWAY } from '../scorers/workers-ai-judge.mjs';

export const WITHHELD = '[withheld: safety classifier did not clear this output]';

/**
 * Default number of characters of an output sent to the classifier. Text past
 * the limit is NOT classified, so keep it at or above the longest output you
 * expect, within the classifier model's context window. Override per config
 * with `safetyClassifier.maxInputChars`.
 */
export const DEFAULT_MAX_INPUT_CHARS = 24000;

export function resolveMaxInputChars(value) {
  if (value === undefined || value === null) return DEFAULT_MAX_INPUT_CHARS;
  if (!Number.isInteger(value) || value <= 0) throw new Error(`safetyClassifier.maxInputChars must be a positive integer, got ${JSON.stringify(value)}`);
  return value;
}

export class WorkersAiSafetyClassifier {
  constructor({ accountId, apiToken, model = '@cf/meta/llama-guard-3-8b', gateway = DEFAULT_GATEWAY, maxInputChars, fetchImpl = globalThis.fetch }) {
    if (!accountId || !apiToken) throw new Error('WorkersAiSafetyClassifier: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required');
    this.id = `workers-ai:${model}`;
    this.maxInputChars = resolveMaxInputChars(maxInputChars);
    this.url = gatewayUrl(accountId, gateway, model);
    Object.defineProperty(this, '_token', { value: apiToken, enumerable: false });
    Object.defineProperty(this, '_fetch', { value: fetchImpl, enumerable: false });
  }

  async classify(text) {
    const res = await this._fetch(this.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this._token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: String(text).slice(0, this.maxInputChars) }] }),
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`safety classifier HTTP ${res.status}`);
    const out = extractWorkersAiText(JSON.parse(raw)).trim().toLowerCase();
    // Llama Guard answers "safe" or "unsafe\nS<n>". Anything else fails closed.
    return { safe: out.startsWith('safe'), label: out.split('\n').join(' ').slice(0, 40) };
  }
}

/** Test/dry-run classifier: flags text containing any of the given markers. */
export class MockSafetyClassifier {
  constructor({ unsafeMarkers = [] } = {}) {
    this.id = 'mock-safety';
    this.unsafeMarkers = unsafeMarkers;
  }
  async classify(text) {
    const hit = this.unsafeMarkers.find((m) => String(text).includes(m));
    return hit ? { safe: false, label: `unsafe (mock marker)` } : { safe: true, label: 'safe' };
  }
}

export function safetyClassifierFromConfig(cfg, env = process.env, { fetchImpl } = {}) {
  if (!cfg) return null;
  if (cfg.type === 'workers-ai')
    return new WorkersAiSafetyClassifier({ accountId: env.CLOUDFLARE_ACCOUNT_ID, apiToken: env.CLOUDFLARE_API_TOKEN, model: cfg.model, gateway: cfg.gateway, maxInputChars: cfg.maxInputChars, ...(fetchImpl ? { fetchImpl } : {}) });
  if (cfg.type === 'mock') return new MockSafetyClassifier(cfg);
  throw new Error(`unknown safetyClassifier type ${cfg.type}`);
}
