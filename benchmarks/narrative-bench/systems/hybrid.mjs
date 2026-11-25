// Hybrid agentic pipeline v0: plan with one model, write with another.
//   { type: "hybrid", id, planner: <client config>, writer: <client config> }
// Each stage gets its own receipt. A continuity-state re-grounding step
// (ADR-005) is not wired in yet; see README "Not measured yet".
import { OpenAICompatibleClient } from './openai-compatible.mjs';
import { mockText } from './mock.mjs';
import { stageReceipt } from '../lib/receipts.mjs';

export function planPrompt(writing) {
  return {
    system: 'You are a story planner. Produce a compact scene-by-scene plan as a numbered list. Do not write prose.',
    user: `${writing.user}\n\nWrite the plan: 4-8 scenes, each one line with who, where, what changes. Keep every listed fact true.`,
  };
}

export function writePrompt(writing, plan) {
  return { system: writing.system, user: `${writing.user}\n\nFollow this plan:\n${plan}` };
}

class MockStageClient {
  constructor(cfg) {
    this.cfg = cfg;
  }
  async complete(prompt, { stage, fixture }) {
    const text = stage === 'plan' ? fixture.cast.map((c, i) => `${i + 1}. ${c.name} moves the story forward.`).join('\n') : mockText(fixture, this.cfg.variant ?? 'faithful');
    return {
      text,
      receipt: stageReceipt({ stage, model: `mock:${this.cfg.variant ?? 'faithful'}`, latencyMs: 0, usage: null, promptText: prompt.system + prompt.user, outputText: text, pricing: { inputPerMTok: 0, outputPerMTok: 0, source: 'mock: free' } }),
    };
  }
}

function stageClient(cfg, deps) {
  return cfg.type === 'mock' ? new MockStageClient(cfg) : new OpenAICompatibleClient({ ...cfg, id: cfg.id ?? cfg.model }, deps);
}

export class HybridSystem {
  constructor(cfg, deps) {
    if (!cfg.planner || !cfg.writer) throw new Error(`hybrid system ${cfg.id}: planner and writer are required`);
    this.id = cfg.id;
    this.planner = stageClient(cfg.planner, deps);
    this.writer = stageClient(cfg.writer, deps);
    this.unsafeModel = !!(cfg.planner.unsafeModel || cfg.writer.unsafeModel);
    this.markers = [cfg.id, cfg.planner.model, cfg.writer.model].filter(Boolean);
  }
  async generate(fixture, { buildWritingPrompt }) {
    const writing = buildWritingPrompt(fixture);
    const plan = await this.planner.complete(planPrompt(writing), { stage: 'plan', fixture, maxTokens: 1024 });
    const out = await this.writer.complete(writePrompt(writing, plan.text), { stage: 'write', fixture });
    return { text: out.text, plan: plan.text, stages: [plan.receipt, out.receipt] };
  }
}
