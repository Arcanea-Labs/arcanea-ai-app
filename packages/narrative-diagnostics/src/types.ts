/**
 * Shared types for the narrative diagnostics.
 *
 * Every diagnostic has two layers:
 *   1. extraction: an Extractor turns a text window into JSON evidence, which is
 *      validated against the diagnostic's JSON schema before anything else sees it;
 *   2. scoring: a pure, deterministic function turns validated evidence into a
 *      DiagnosticResult. Scorers never call a model.
 */

/** A minimal JSON-schema subset. See validate.ts for exactly what is enforced. */
export interface JsonSchema {
  type?: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean' | 'null' | Array<'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean' | 'null'>;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: ReadonlyArray<string | number | boolean | null>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  description?: string;
}

/** Ids are stable within one extraction and are the dedupe key. */
export interface EvidenceItem {
  id: string;
  /** 1-indexed paragraph of the text the item was taken from. */
  paragraph: number;
}

export interface DiagnosticResult<E = unknown> {
  pass: boolean;
  /** Name of the first gate that failed, or null on pass. */
  failedGate: string | null;
  /** The evidence that decided the verdict (the passing chain, or what was closest). */
  selectedEvidence: E[];
  counts: Record<string, number>;
}

export type DiagnosticId =
  | 'setup_live_problem'
  | 'same_goal_active'
  | 'blocked_goal_response'
  | 'mystery_unresolved'
  | 'initial_situation_clear'
  | 'viewpoint_control'
  | 'exposition_local_need'
  | 'plan_following';

/** Text handed to the extraction layer. */
export interface DiagnosticInput {
  preview?: string;
  chapter?: string;
}

export interface PromptPair {
  system: string;
  user: string;
}

/** Options a scorer may read. Each scorer documents the ones it uses. */
export interface ScoreOptions {
  /** Number of paragraphs in the chapter opening (viewpoint_control). */
  openingLength?: number;
  /** Share threshold in [0, 1] (exposition_local_need). */
  threshold?: number;
}

/** One diagnostic: schema + prompt builder + pure scorer. */
export interface DiagnosticSpec<Ev> {
  id: DiagnosticId;
  description: string;
  schema: JsonSchema;
  /** Which texts the extraction needs. */
  needs: ReadonlyArray<'preview' | 'chapter'>;
  buildPrompt(input: DiagnosticInput): PromptPair;
  score(evidence: Ev, options?: ScoreOptions): DiagnosticResult;
}
