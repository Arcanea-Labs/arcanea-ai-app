// Length adherence against fixture.targetLength.
import { wordCount } from '../lib/text.mjs';

export const DEFAULT_TOLERANCE = 0.25;

/**
 * score = 1 inside ±tolerance of the target; falls linearly to 0 at
 * ±2×tolerance; 0 beyond. ratio = words / target.
 */
export function scoreLength(text, targetLength) {
  const target = targetLength.words;
  const tol = targetLength.tolerance ?? DEFAULT_TOLERANCE;
  const words = wordCount(text);
  const ratio = words / target;
  const dev = Math.abs(ratio - 1);
  const score = dev <= tol ? 1 : Math.max(0, 1 - (dev - tol) / tol);
  return { words, target, tolerance: tol, ratio, score, within: dev <= tol };
}
