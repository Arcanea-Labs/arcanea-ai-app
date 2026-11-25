/**
 * Cost receipts: one per model call, including failed validation attempts.
 *
 * Prices are injected; this package ships no price list. A call whose model has
 * no price gets usdEstimate null and pricingSource "unknown". It is never
 * silently treated as free.
 */

import type { StageName } from "./stages.js";

export interface CostReceipt {
  jobId: string;
  stage: StageName;
  /** "book" for book-level stages, "ch-<n>" for chapter-level stages. */
  unit: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  usdEstimate: number | null;
  pricingSource: string;
  /** ISO-8601 timestamp. */
  ts: string;
}

/** Per-token pricing for an API model. */
export interface TokenPrice {
  kind: "tokens";
  usdPerMillionInput: number;
  usdPerMillionOutput: number;
  /** Where the price came from, e.g. a URL and date. Copied to the receipt. */
  source: string;
}

/** Wallclock pricing for a self-hosted model on a rented or owned GPU. */
export interface GpuPrice {
  kind: "gpu";
  gpuHourlyUsd: number;
  source: string;
}

export type ModelPrice = TokenPrice | GpuPrice;

/** Keyed by model id as reported on GenerateResult.model. */
export type PricingTable = Readonly<Record<string, ModelPrice>>;

export function estimateUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number },
  latencyMs: number,
  pricing: PricingTable | undefined,
): { usdEstimate: number | null; pricingSource: string } {
  const price = pricing ? pricing[model] : undefined;
  if (!price) return { usdEstimate: null, pricingSource: "unknown" };
  if (price.kind === "tokens") {
    const usd =
      (usage.inputTokens / 1_000_000) * price.usdPerMillionInput +
      (usage.outputTokens / 1_000_000) * price.usdPerMillionOutput;
    return { usdEstimate: usd, pricingSource: `tokens:${price.source}` };
  }
  const usd = price.gpuHourlyUsd * (latencyMs / 3_600_000);
  return { usdEstimate: usd, pricingSource: `gpu-wallclock:${price.source}` };
}

export function makeReceipt(args: {
  jobId: string;
  stage: StageName;
  unit: string;
  model: string;
  provider: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  pricing?: PricingTable;
  now?: () => Date;
}): CostReceipt {
  const { usdEstimate, pricingSource } = estimateUsd(args.model, args.usage, args.latencyMs, args.pricing);
  return {
    jobId: args.jobId,
    stage: args.stage,
    unit: args.unit,
    model: args.model,
    provider: args.provider,
    inputTokens: args.usage.inputTokens,
    outputTokens: args.usage.outputTokens,
    latencyMs: args.latencyMs,
    usdEstimate,
    pricingSource,
    ts: (args.now ? args.now() : new Date()).toISOString(),
  };
}

export function receiptsToJsonl(receipts: readonly CostReceipt[]): string {
  return receipts.map((r) => JSON.stringify(r)).join("\n") + (receipts.length ? "\n" : "");
}

const RECEIPT_KEYS: ReadonlyArray<keyof CostReceipt> = [
  "jobId", "stage", "unit", "model", "provider", "inputTokens", "outputTokens",
  "latencyMs", "usdEstimate", "pricingSource", "ts",
];

export function receiptsFromJsonl(jsonl: string): CostReceipt[] {
  const out: CostReceipt[] = [];
  jsonl.split("\n").forEach((line, i) => {
    if (line.trim().length === 0) return;
    const v = JSON.parse(line) as Record<string, unknown>;
    for (const k of RECEIPT_KEYS) {
      if (!(k in v)) throw new Error(`receipt line ${i + 1} is missing "${k}"`);
    }
    if (v["usdEstimate"] !== null && typeof v["usdEstimate"] !== "number") {
      throw new Error(`receipt line ${i + 1}: usdEstimate must be a number or null`);
    }
    out.push(v as unknown as CostReceipt);
  });
  return out;
}

export interface CostTotal {
  /** Sum over receipts that had a price. A lower bound when unpricedCount > 0. */
  pricedUsd: number;
  pricedCount: number;
  /** Receipts whose model had no price. Their cost is unknown, not zero. */
  unpricedCount: number;
  receiptCount: number;
  inputTokens: number;
  outputTokens: number;
  /** True only when every receipt was priced. */
  complete: boolean;
}

export function totalCost(receipts: readonly CostReceipt[]): CostTotal {
  let pricedUsd = 0;
  let pricedCount = 0;
  let unpricedCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const r of receipts) {
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    if (r.usdEstimate === null) unpricedCount++;
    else {
      pricedUsd += r.usdEstimate;
      pricedCount++;
    }
  }
  return {
    pricedUsd,
    pricedCount,
    unpricedCount,
    receiptCount: receipts.length,
    inputTokens,
    outputTokens,
    complete: unpricedCount === 0,
  };
}
