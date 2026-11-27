// Official CLI on the user's own subscription (ADR-006): `claude -p`,
// `codex exec`, `gemini -p` and the like. No API keys, no per-call price.
//
// Config:
//   { type: "cli", id, command, args?: string[], promptVia?: "stdin"|"arg",
//     model?, timeoutMs?, maxOutputBytes?, keepApiKeyEnv?: false, unsafeModel? }
//
// Safety of the call:
// - The process is spawned with an argv array and `shell: false`. The prompt
//   never becomes part of a shell string: it goes on stdin (default) or as
//   exactly one extra argv element (`promptVia: "arg"`).
// - API-key env vars (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, ...)
//   are removed from the child's environment by default, so the CLI uses the
//   subscription login instead of silently billing an API account. Set
//   `keepApiKeyEnv: true` only if you mean to.
// - A timeout kills the child (SIGTERM, then SIGKILL after a grace period).
// - Receipts record latency, chars/4 token estimates, `usdEstimate: null` and
//   `pricingSource: "subscription"`: a flat subscription has no honest per-call price.
import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import { stageReceipt } from '../lib/receipts.mjs';

export const SUBSCRIPTION_PRICING = Object.freeze({ source: 'subscription' });

/** Env var names stripped from the child unless keepApiKeyEnv is set. */
export const API_KEY_ENV = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'AI_GATEWAY_API_KEY',
  'OPENROUTER_API_KEY',
  'CLOUDFLARE_API_TOKEN',
];

const KILL_GRACE_MS = 2000;

function childEnv(env, keep) {
  const out = { ...env };
  if (keep) return out;
  for (const k of Object.keys(out)) {
    // Windows env names are case-insensitive, so match on the upper-cased name.
    const name = k.toUpperCase();
    if (API_KEY_ENV.includes(name) || /_API_KEY$/.test(name)) delete out[k];
  }
  return out;
}

export function validateCliConfig(cfg) {
  const where = `cli system ${cfg.id}`;
  if (typeof cfg.command !== 'string' || !cfg.command.trim()) throw new Error(`${where}: command must be a non-empty string`);
  if (cfg.args !== undefined && !(Array.isArray(cfg.args) && cfg.args.every((a) => typeof a === 'string')))
    throw new Error(`${where}: args must be an array of strings`);
  if (cfg.promptVia !== undefined && !['stdin', 'arg'].includes(cfg.promptVia)) throw new Error(`${where}: promptVia must be "stdin" or "arg"`);
  for (const k of ['timeoutMs', 'maxOutputBytes'])
    if (cfg[k] !== undefined && !(Number.isInteger(cfg[k]) && cfg[k] > 0)) throw new Error(`${where}: ${k} must be a positive integer`);
  if ('shell' in cfg) throw new Error(`${where}: shell is not supported; give command and args as an array`);
  if ('apiKeyEnv' in cfg) throw new Error(`${where}: cli systems run on a subscription and take no apiKeyEnv`);
}

/** Runs the command once. Resolves { stdout, stderr, code, latencyMs }; rejects on spawn error, timeout or overflow. */
export function runCli({ command, args = [], input = null, timeoutMs, maxOutputBytes, env, label }) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    let child;
    try {
      child = spawn(command, args, { shell: false, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    } catch (err) {
      reject(new Error(`${label}: could not start ${command}: ${err.message}`));
      return;
    }
    const out = [];
    const errOut = [];
    let outBytes = 0;
    let failure = null;
    let settled = false;
    const kill = (why) => {
      if (failure) return;
      failure = why;
      child.kill('SIGTERM');
      setTimeout(() => child.exitCode === null && child.signalCode === null && child.kill('SIGKILL'), KILL_GRACE_MS).unref();
    };
    const timer = setTimeout(() => kill(new Error(`${label}: timed out after ${timeoutMs} ms`)), timeoutMs);
    child.stdout.on('data', (b) => {
      outBytes += b.length;
      if (outBytes > maxOutputBytes) kill(new Error(`${label}: output exceeded ${maxOutputBytes} bytes`));
      else out.push(b);
    });
    child.stderr.on('data', (b) => {
      if (errOut.reduce((s, x) => s + x.length, 0) < 64 * 1024) errOut.push(b);
    });
    child.stdin.on('error', () => {}); // the CLI may exit before reading stdin; the exit code tells the story
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`${label}: could not start ${command}: ${err.message}`));
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (failure) return reject(failure);
      resolve({ stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(errOut).toString('utf8'), code, signal, latencyMs: Date.now() - t0 });
    });
    if (input !== null) child.stdin.end(input);
    else child.stdin.end();
  });
}

export class CliClient {
  constructor(cfg, { env = process.env } = {}) {
    validateCliConfig(cfg);
    this.cfg = { args: [], promptVia: 'stdin', timeoutMs: 600000, maxOutputBytes: 4 * 1024 * 1024, ...cfg };
    // env stays non-enumerable so nothing from it serialises into run.json or logs.
    Object.defineProperty(this, 'env', { value: env, enumerable: false });
  }

  get model() {
    return this.cfg.model ?? `cli:${basename(this.cfg.command)}`;
  }

  async complete({ system, user }, { stage = 'write' } = {}) {
    const c = this.cfg;
    const prompt = system ? `${system}\n\n${user}` : user;
    const viaArg = c.promptVia === 'arg';
    const label = `system ${c.id}`;
    const r = await runCli({
      command: c.command,
      args: viaArg ? [...c.args, prompt] : [...c.args],
      input: viaArg ? null : prompt,
      timeoutMs: c.timeoutMs,
      maxOutputBytes: c.maxOutputBytes,
      env: childEnv(this.env, c.keepApiKeyEnv === true),
      label,
    });
    if (r.code !== 0) throw new Error(`${label}: ${basename(c.command)} exited with ${r.code ?? r.signal}: ${r.stderr.trim().slice(0, 200)}`);
    const text = r.stdout.trim();
    if (!text) throw new Error(`${label}: ${basename(c.command)} wrote nothing to stdout`);
    const receipt = stageReceipt({ stage, model: this.model, latencyMs: r.latencyMs, usage: null, promptText: prompt, outputText: text, pricing: SUBSCRIPTION_PRICING });
    return { text, receipt: { ...receipt, pricingSource: 'subscription' } };
  }
}

export class CliSystem {
  constructor(cfg, deps = {}) {
    this.id = cfg.id;
    this.client = new CliClient(cfg, deps);
    this.unsafeModel = !!cfg.unsafeModel;
    this.markers = [cfg.id, this.client.model, basename(cfg.command), ...(cfg.model?.includes('/') ? cfg.model.split('/') : [])].filter(Boolean);
  }
  async generate(fixture, { buildWritingPrompt }) {
    const { text, receipt } = await this.client.complete(buildWritingPrompt(fixture));
    return { text, stages: [receipt] };
  }
}
