// Deterministic offline systems for --dry-run and tests.
//   faithful: states every fact, keeps names, lands near target length
//   drift:    misspells a cast name, breaks one fact, loops, runs short
// The text is assembled from the fixture itself; scores on it only prove
// that the scorers react, not that anything writes well.
import { prng, hash32 } from '../lib/text.mjs';
import { stageReceipt } from '../lib/receipts.mjs';
import { buildWritingPrompt } from '../lib/fixtures.mjs';

const SUBJ = ['the tide', 'the lamp', 'a gull', 'the wind', 'the room', 'the road', 'an old door', 'the kettle', 'the light', 'the rain', 'a clock', 'the floor'];
const VERB = ['shifted', 'waited', 'leaned', 'hummed', 'cooled', 'settled', 'creaked', 'flickered', 'turned', 'ticked', 'sighed', 'held'];
const TAIL = ['against the wall', 'for a long moment', 'without hurry', 'as if listening', 'in the grey hour', 'under the eaves', 'toward the window', 'before anyone spoke', 'and then went still', 'somewhere below'];

function filler(rand, nWords) {
  const out = [];
  let count = 0;
  while (count < nWords) {
    const s = `${SUBJ[Math.floor(rand() * SUBJ.length)]} ${VERB[Math.floor(rand() * VERB.length)]} ${TAIL[Math.floor(rand() * TAIL.length)]}.`;
    out.push(s[0].toUpperCase() + s.slice(1));
    count += s.split(/\s+/).length;
  }
  return out;
}

function countWords(parts) {
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

function misspell(name) {
  return name + name[name.length - 1];
}

export function mockText(fixture, variant = 'faithful') {
  const rand = prng(hash32(`${fixture.id}:${variant}`));
  const castLines = fixture.cast.map((c) => `${c.name} was ${c.traits.join(', ')}.`);
  const facts = fixture.mustHold.map((m) => (/[.!?]$/.test(m.fact) ? m.fact : m.fact + '.'));
  const probes = fixture.probes.map((p) => p.passExample);

  if (variant === 'faithful') {
    const core = [...castLines, ...facts, ...probes];
    const pad = filler(rand, Math.max(0, fixture.targetLength.words - countWords(core)));
    const chunk = Math.ceil(pad.length / 3);
    return [castLines.join(' '), pad.slice(0, chunk).join(' '), facts.join(' '), pad.slice(chunk, 2 * chunk).join(' '), probes.join(' '), pad.slice(2 * chunk).join(' ')]
      .filter(Boolean)
      .join('\n\n');
  }

  if (variant === 'drift') {
    const first = fixture.cast[0].name.split(/\s+/)[0];
    const wrong = misspell(first);
    const broken = [fixture.mustHold[0].violationExample, ...(fixture.probes[0].failExample ? [fixture.probes[0].failExample] : [])];
    const pad = filler(rand, Math.round(fixture.targetLength.words * 0.35));
    const loop = pad[0];
    const later = `Later that night ${wrong} came back. Nobody spoke to ${wrong} for a while.`;
    const para = pad.slice(1, 6).join(' ');
    return [castLines.join(' '), pad.slice(6).join(' '), later, broken.join(' '), para, para, para, [loop, loop, loop, loop].join(' ')].join('\n\n');
  }
  throw new Error(`unknown mock variant ${variant}`);
}

export class MockSystem {
  constructor({ id, variant = 'faithful' }) {
    this.id = id;
    this.variant = variant;
    this.markers = [id];
    this.unsafeModel = false;
  }
  async generate(fixture) {
    const t0 = Date.now();
    const prompt = buildWritingPrompt(fixture);
    const text = mockText(fixture, this.variant);
    return {
      text,
      stages: [
        stageReceipt({
          stage: 'write',
          model: `mock:${this.variant}`,
          latencyMs: Date.now() - t0,
          usage: null,
          promptText: prompt.system + prompt.user,
          outputText: text,
          pricing: { inputPerMTok: 0, outputPerMTok: 0, source: 'mock: free' },
        }),
      ],
    };
  }
}
