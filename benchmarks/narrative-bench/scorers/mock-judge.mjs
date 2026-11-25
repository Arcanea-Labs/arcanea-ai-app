// Offline mock judges for --dry-run and tests. Their scores are a function of
// the text only, so they are reproducible. They measure nothing about quality.
import { words } from '../lib/text.mjs';
import { distinctN } from './diversity.mjs';
import { hash32 } from '../lib/text.mjs';

function extractSubmission(user) {
  const m = /--- SUBMISSION START ---\n([\s\S]*?)\n--- SUBMISSION END ---/.exec(user);
  return m ? m[1] : '';
}

export class MockJudge {
  /** variant "lexical" scores from distinct-2; variant "hash" from a text hash. */
  constructor({ id = 'mock-judge', family = 'mock-a', variant = 'lexical' } = {}) {
    this.id = id;
    this.family = family;
    this.variant = variant;
    this.calls = [];
  }

  async complete(prompt) {
    this.calls.push(prompt);
    const text = extractSubmission(prompt.user);
    let lq;
    let og;
    if (this.variant === 'lexical') {
      const d2 = distinctN(words(text), 2) ?? 0;
      lq = Math.max(1, Math.min(10, Math.round(d2 * 10)));
      og = Math.max(1, Math.min(10, lq - 1));
    } else {
      const h = hash32(text);
      lq = 1 + (h % 10);
      og = 1 + ((h >>> 8) % 10);
    }
    const verdict = lq >= 8 ? 'accept' : lq >= 5 ? 'revise' : 'reject';
    return {
      text: JSON.stringify({ literary_quality: lq, originality: og, editorial: { verdict, reasons: [`mock ${this.variant} judge; not a quality signal`] } }),
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: 0,
    };
  }
}

export function mockPanelJudges() {
  return [new MockJudge({ id: 'mock-judge-lexical', family: 'mock-a', variant: 'lexical' }), new MockJudge({ id: 'mock-judge-hash', family: 'mock-b', variant: 'hash' })];
}
