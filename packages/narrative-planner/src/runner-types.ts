import type { StageDataMap, StageName } from "./stages.js";

export type CanonVerdict = "pass" | "flag" | "block";

export interface CanonFinding {
  code: "forbidden_term" | "undeclared_rule_key" | "unknown_character" | "reserved_canon_name";
  severity: "flag" | "block";
  message: string;
  /** The offending value: the term, key or name. */
  subject: string;
}

export interface CanonReview {
  verdict: CanonVerdict;
  findings: CanonFinding[];
}

/**
 * A validated stage output. Always status "candidate": generated material is
 * never canon. Promotion needs a human approval record outside this package.
 */
export interface StageResult<S extends StageName = StageName> {
  stage: S;
  unit: string;
  data: StageDataMap[S];
  raw: string;
  model: string;
  attempts: number;
  status: "candidate";
  canon?: CanonReview;
}
