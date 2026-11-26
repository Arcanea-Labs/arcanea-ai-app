import { MockSystem } from './mock.mjs';
import { OpenAICompatibleSystem } from './openai-compatible.mjs';
import { HybridSystem } from './hybrid.mjs';
import { HybridArcaneaSystem } from './hybrid-arcanea.mjs';
import { CliSystem } from './cli.mjs';

export function createSystem(cfg, deps = {}) {
  if (!cfg?.id) throw new Error('system config needs an id');
  switch (cfg.type) {
    case 'mock':
      return new MockSystem(cfg);
    case 'openai-compatible':
      return new OpenAICompatibleSystem(cfg, deps);
    case 'cli':
      return new CliSystem(cfg, deps);
    case 'hybrid':
      return new HybridSystem(cfg, deps);
    case 'hybrid-arcanea':
      return new HybridArcaneaSystem(cfg, deps);
    default:
      throw new Error(`system ${cfg.id}: unknown type ${cfg.type}`);
  }
}

export const DRY_RUN_SYSTEMS = [
  { id: 'mock-faithful', type: 'mock', variant: 'faithful' },
  { id: 'mock-drift', type: 'mock', variant: 'drift' },
  { id: 'mock-hybrid', type: 'hybrid', planner: { type: 'mock', variant: 'faithful' }, writer: { type: 'mock', variant: 'faithful' } },
  { id: 'hybrid-arcanea', type: 'hybrid-arcanea', chapters: 3, planner: { type: 'mock' }, extractor: { type: 'mock' } },
];
