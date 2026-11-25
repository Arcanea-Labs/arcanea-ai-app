// Cost and latency receipts. A price we do not know is null, never a guess.

/** Rough token estimate (chars / 4), used only when an API reports none. */
export function estimateTokens(text) {
  return Math.ceil(String(text ?? '').length / 4);
}

/**
 * pricing: { inputPerMTok, outputPerMTok, source } in USD per million tokens.
 * Returns null when pricing or either token count is unknown.
 */
export function usdEstimate(inputTokens, outputTokens, pricing) {
  if (!pricing || typeof pricing.inputPerMTok !== 'number' || typeof pricing.outputPerMTok !== 'number') return null;
  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') return null;
  return (inputTokens * pricing.inputPerMTok + outputTokens * pricing.outputPerMTok) / 1e6;
}

export function stageReceipt({ stage, model, latencyMs, usage, promptText, outputText, pricing }) {
  const fromApi = usage && typeof usage.inputTokens === 'number' && typeof usage.outputTokens === 'number';
  const inputTokens = fromApi ? usage.inputTokens : estimateTokens(promptText);
  const outputTokens = fromApi ? usage.outputTokens : estimateTokens(outputText);
  return {
    stage,
    model,
    latencyMs,
    inputTokens,
    outputTokens,
    tokensSource: fromApi ? 'api' : 'estimate-chars-div-4',
    usdEstimate: usdEstimate(inputTokens, outputTokens, pricing),
    priceSource: pricing?.source ?? null,
  };
}

/** Sum stage receipts; usd stays null if any stage's price is unknown. */
export function totalReceipt(stages) {
  const sum = (k) => stages.reduce((s, r) => s + (r[k] ?? 0), 0);
  const usdKnown = stages.length > 0 && stages.every((r) => typeof r.usdEstimate === 'number');
  return {
    latencyMs: sum('latencyMs'),
    inputTokens: sum('inputTokens'),
    outputTokens: sum('outputTokens'),
    usdEstimate: usdKnown ? sum('usdEstimate') : null,
  };
}
