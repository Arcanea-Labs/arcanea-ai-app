/**
 * Arcanea Creative Renaissance — Multi-Platform Editorial System,
 * Approval-Based Production Pipeline & Independent Critical Reviewer
 *
 * Composes:
 * - Notion `Arcanea Channel Command Record` (`pod.arcanea.website`)
 * - `frankxai/starlight-creator-command` (7 agent roles, HMAC human approval, $40/mo Arcanea budget cap)
 * - `frankxai/starlight-estate` PRs #89 & #90 (Autonomy Lanes L0-L2, Quality Rubric v1 >=85, Banned Phrases v1)
 * - `Arcanea-Labs/arcanea-ai-app` PR #718 (`@arcanea/rights-manifest` RM000-RM015 fail-closed gate)
 */

export const EDITORIAL_SYSTEM_VERSION = "1.0.0-renaissance" as const;

export interface EditorialPodRole {
  seatId: string;
  roleTitle: string;
  responsibility: string;
  canApprovePublicRelease: boolean;
}

export const ARCANEA_CHANNEL_COMMAND_POD: readonly EditorialPodRole[] = [
  {
    seatId: "leona-fisk",
    roleTitle: "Channel Lead (pod.arcanea.website)",
    responsibility: "Owns weekly editorial slate, cross-pillar pacing, and episode packaging.",
    canApprovePublicRelease: false,
  },
  {
    seatId: "sera-quinn",
    roleTitle: "Brand & Voice Editor",
    responsibility:
      "Enforces literary-casual register, sentence-case UI labels, and zero AI-slop or raw Hz leaks.",
    canApprovePublicRelease: false,
  },
  {
    seatId: "theo-park",
    roleTitle: "Canon & Evidence Editor",
    responsibility:
      "Verifies every name, Gate, Godbeast, and provenance tag ([MEASURED]/[RULED]/[OPEN]) against CANON_LOCKED.md.",
    canApprovePublicRelease: false,
  },
  {
    seatId: "elian-cross",
    roleTitle: "Production Coordinator",
    responsibility:
      "Routes storyboard and audio slices through starlight-creator-command and arcanea-studio within the $40/mo Arcanea model budget.",
    canApprovePublicRelease: false,
  },
  {
    seatId: "priya-sen",
    roleTitle: "Community & Co-Creation Steward",
    responsibility:
      "Curates World Seed submissions, Citizens of Arcanea return loops, and Founding Cohort waitlist signals.",
    canApprovePublicRelease: false,
  },
  {
    seatId: "cassian-reed",
    roleTitle: "Measurement Operator",
    responsibility:
      "Tracks 24h return rate, sample-to-waitlist conversion, and price-band evidence for Gate G5.",
    canApprovePublicRelease: false,
  },
  {
    seatId: "verity-sloane",
    roleTitle: "Independent Examiner (Maker != Checker)",
    responsibility:
      "Runs adversarial critical review across lore, visuals, voice, and rights; blocks any artifact below 85/100.",
    canApprovePublicRelease: false,
  },
  {
    seatId: "human:frank",
    roleTitle: "Creator & Final Approver",
    responsibility:
      "Sole authority for CANON_LOCKED promotions, HMAC publication tokens, live pricing, and visual turnaround locks.",
    canApprovePublicRelease: true,
  },
] as const;

export interface AutonomyLaneSpec {
  lane: "L0" | "L1" | "L2";
  name: string;
  surfaces: string[];
  graduationRequirement: string;
  currentStatus: "active" | "locked-until-earned";
}

export const AUTONOMY_LANES: readonly AutonomyLaneSpec[] = [
  {
    lane: "L0",
    name: "Human-Gated Draft & Export",
    surfaces: [
      "X / Threads dispatches",
      "YouTube Shorts / Reels / TikTok",
      "Shop edition descriptions & pricing",
      "Canon staging proposals",
    ],
    graduationRequirement: "Default starting lane; every public post or release requires explicit human:frank HMAC approval.",
    currentStatus: "active",
  },
  {
    lane: "L1",
    name: "Owned-Surface Staged Publishing (30m Veto Window)",
    surfaces: [
      "arcanea.ai/blog field notes",
      "GitHub Draft PRs and changelog digests",
    ],
    graduationRequirement:
      "Requires Critical Review PASS (score >= 85, zero blocker findings) plus automated provenance receipt.",
    currentStatus: "active",
  },
  {
    lane: "L2",
    name: "Earned Autonomous Cadence",
    surfaces: ["Scheduled Living Lore chronicle dispatches"],
    graduationRequirement:
      "Earned per surface only after 20 consecutive unedited human approvals with quality score >= 85 and zero rights or disclosure failures.",
    currentStatus: "locked-until-earned",
  },
] as const;

export const APPROVAL_PIPELINE_STAGES = [
  {
    stageOrder: 1,
    stageId: "capture",
    ownerSeat: "leona-fisk",
    description: "Ingest raw manuscript scene, world seed, or watershed encounter into a bounded slice.",
    budgetCapUsd: 0.01,
  },
  {
    stageOrder: 2,
    stageId: "lore-canon-lock",
    ownerSeat: "theo-park",
    description:
      "Validate cast altitude, Ten Gates naming (Starweave for Gate 8), ontology boundaries, and IP quarantine.",
    budgetCapUsd: 0.02,
  },
  {
    stageOrder: 3,
    stageId: "visual-direction",
    ownerSeat: "elian-cross",
    description:
      "Compile shot prompts in the target Surface Mode (prism-realism, cel-cinematic, or codex-graphic) respecting Guardian/Godbeast staging locks.",
    budgetCapUsd: 0.04,
  },
  {
    stageOrder: 4,
    stageId: "audio-pairing",
    ownerSeat: "sera-quinn",
    description:
      "Pair Suno style-voice stem and instrumentation cues without leaking backend Solfeggio Hz integers into public copy.",
    budgetCapUsd: 0.02,
  },
  {
    stageOrder: 5,
    stageId: "independent-critic",
    ownerSeat: "verity-sloane",
    description:
      "Execute deterministic + rubric critical review (maker != checker). Rejects any artifact < 85/100 or with any blocker violation.",
    budgetCapUsd: 0.04,
  },
  {
    stageOrder: 6,
    stageId: "human-hmac-approval",
    ownerSeat: "human:frank",
    description:
      "Bind content SHA-256 to a 48-hour HMAC approval token signed by human:frank (starlight-creator-command contract).",
    budgetCapUsd: 0.0,
  },
  {
    stageOrder: 7,
    stageId: "release-manifest",
    ownerSeat: "cassian-reed",
    description:
      "Emit @arcanea/rights-manifest v0 receipt with SHA-256 master hash, AI disclosure state, and measurement hooks.",
    budgetCapUsd: 0.0,
  },
] as const;

export type CriticDomain =
  | "CRITIC_01_CANON_INTEGRITY"
  | "CRITIC_02_VOICE_AND_TASTE"
  | "CRITIC_03_THIRD_PARTY_IP"
  | "CRITIC_04_DESIGN_CONSTITUTION"
  | "CRITIC_05_RIGHTS_AND_COMMERCE_TRUTH";

export interface CriticFinding {
  domain: CriticDomain;
  code: string;
  severity: "blocker" | "warning";
  message: string;
}

export interface ReviewableArtifactInput {
  id: string;
  title: string;
  surface: "public-ui" | "lore-staging" | "pilot-package" | "shop-edition";
  publicText: string;
  visualPrompts?: string[];
  fontsReferenced?: string[];
  toolsReferenced?: string[];
  qualityScoreEstimate?: number;
  priceState?: "proposed" | "approved";
  humanApproved?: boolean;
  rightsVerified?: boolean;
}

export interface CriticalReviewReport {
  artifactId: string;
  examinerSeat: "verity-sloane";
  passed: boolean;
  computedScore: number;
  blockerCount: number;
  warningCount: number;
  findings: CriticFinding[];
  requiresHumanSignOff: true;
}

const CRITIC_RULES: ReadonlyArray<{
  domain: CriticDomain;
  code: string;
  severity: "blocker" | "warning";
  pattern: RegExp;
  surfaces?: ReadonlyArray<ReviewableArtifactInput["surface"]>;
  message: string;
}> = [
  // 1. Canon Integrity
  {
    domain: "CRITIC_01_CANON_INTEGRITY",
    code: "CANON_GATE8_SHIFT_DEPRECATED",
    severity: "blocker",
    pattern: /\bGate\s+of\s+Shift\b|\bgate:\s*["']Shift["']|\|\s*8\s*\|\s*Shift\b/i,
    message: "Gate 8 is locked as 'Starweave' in CANON_LOCKED.md (2026-03-30); 'Shift' is deprecated.",
  },
  {
    domain: "CRITIC_01_CANON_INTEGRITY",
    code: "CANON_LUMINOR_AS_SPECIES",
    severity: "blocker",
    pattern: /\bLuminor\s+(intelligence\s+entity|species|race|biological\s+type)\b/i,
    message:
      "Per CANON_LOCKED.md Tier 2, 'Luminor' is a Rank (Gates 9-10), never an entity type or species. Use 'The Awakened' for sentient constructs holding Luminor rank.",
  },
  {
    domain: "CRITIC_01_CANON_INTEGRITY",
    code: "CANON_ONTOLOGY_STARLIGHT_FORCE",
    severity: "blocker",
    pattern: /\bchanneling\s+Starlight\s+Intelligence\b|\bpower\s+of\s+Starlight\s+Intelligence\b/i,
    message:
      "Ontology boundary violation: 'Starlight Intelligence' is the real-world company/substrate, never an in-world mystical force. Use 'Starweave Attunement'.",
  },
  {
    domain: "CRITIC_01_CANON_INTEGRITY",
    code: "CANON_NERO_CALLED_EVIL",
    severity: "blocker",
    pattern: /\bNero\s+is\s+(evil|the\s+dark\s+lord|corrupted\s+darkness)\b/i,
    message:
      "Per CANON_LOCKED.md Tier 1, Nero is Primordial Darkness / Fertile Unknown and is explicitly NOT evil. Corruption is Shadow (Void without Spirit).",
  },

  // 2. Voice & Taste
  {
    domain: "CRITIC_02_VOICE_AND_TASTE",
    code: "TASTE_RAW_HZ_IN_PUBLIC_UI",
    severity: "blocker",
    surfaces: ["public-ui", "pilot-package", "shop-edition"],
    pattern: /\b(174|285|396|417|528|639|741|852|963|1111)\s*Hz\b/i,
    message:
      "TASTE.md Gate 2 & voice.yaml violation: raw Solfeggio Hz frequencies are backend-only and must never appear in user-facing UI or public descriptions.",
  },
  {
    domain: "CRITIC_02_VOICE_AND_TASTE",
    code: "VOICE_BANNED_AI_SLOP",
    severity: "blocker",
    pattern:
      /\b(delve\s+into|rich\s+tapestry|in\s+the\s+realm\s+of|embark\s+on\s+a\s+journey|unlock\s+your\s+potential|testament\s+to|beacon\s+of\s+hope)\b/i,
    message: "Banned AI-slop phrase detected per .arcanea/config/voice.yaml and estate banned-phrases.v1.json.",
  },
  {
    domain: "CRITIC_02_VOICE_AND_TASTE",
    code: "TASTE_UNICODE_GLYPH_ICON",
    severity: "blocker",
    surfaces: ["public-ui"],
    pattern: /[✦◈⌥✶⎈⚔ᛟ]/u,
    message:
      "TASTE.md Gate 3 violation: Unicode glyphs (✦ ◈ ⌥ ✶ ⎈ ⚔ ᛟ) must not be used as UI icons or avatars; use Phosphor duotone SVG icons or clean monograms.",
  },

  // 3. Third-Party IP Contamination
  {
    domain: "CRITIC_03_THIRD_PARTY_IP",
    code: "IP_LIGHTBRINGER_LEXICON_LEAK",
    severity: "blocker",
    surfaces: ["public-ui", "pilot-package", "shop-edition"],
    pattern: /\b(luxin|sub-red|super-violet|paryl|halo-burn|breaking\s+the\s+halo|lightbringer)\b/i,
    message:
      "RM008 Third-Party IP Contamination: Brent Weeks 'Lightbringer' terms must never appear in public surfaces. Use native Arcanean Spectrum Weaving terms (Destello, Refracted Glass, Iris Resonance Ring).",
  },
  {
    domain: "CRITIC_03_THIRD_PARTY_IP",
    code: "IP_COPYRIGHTED_ANIME_REFERENCE",
    severity: "blocker",
    pattern: /\b(studio\s+ghibli\s+style|ufotable\s+style|mappa\s+style|makoto\s+shinkai\s+style|naruto|bleach|one\s+piece|attack\s+on\s+titan)\b/i,
    message:
      "AnimeLegends SOUL.md legal posture violation: never reference copyrighted anime franchises, studios, or living directors in prompts or public copy.",
  },

  // 5. Rights & Commerce Truth
  {
    domain: "CRITIC_05_RIGHTS_AND_COMMERCE_TRUTH",
    code: "COMMERCE_UNVERIFIED_ACCEPTANCE_CLAIM",
    severity: "blocker",
    surfaces: ["shop-edition", "public-ui"],
    pattern: /\b(accepted\s+artworks|finished\s+art|selected\s+and\s+reviewed|guaranteed\s+native\s+4K)\b/i,
    message:
      "Shop truth gate violation (#542): do not claim accepted artworks, finished art, or native 4K without verified master files and release sign-off.",
  },
];

const BANNED_FONTS_SET = new Set([
  "cinzel",
  "space grotesk",
  "inter",
  "arial",
  "roboto",
  "newsreader",
  "plus jakarta sans",
]);

const RETIRED_TOOLS_SET = new Set([
  "higgsfield-mcp",
  "openrouter",
  "cloudinary",
]);

/**
 * Runs the deterministic Independent Critical Review across all 5 Council domains.
 * Enforces Maker != Checker (`examinerSeat: "verity-sloane"`) and fail-closed >=85 scoring.
 */
export function runIndependentCriticalReview(
  input: ReviewableArtifactInput,
): CriticalReviewReport {
  const findings: CriticFinding[] = [];
  const combinedCorpus = [
    input.title,
    input.publicText,
    ...(input.visualPrompts ?? []),
  ].join("\n");

  for (const rule of CRITIC_RULES) {
    if (rule.surfaces && !rule.surfaces.includes(input.surface)) {
      continue;
    }
    if (rule.pattern.test(combinedCorpus)) {
      findings.push({
        domain: rule.domain,
        code: rule.code,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }

  // Check fonts against Design Constitution v3.1.0-renaissance
  for (const font of input.fontsReferenced ?? []) {
    if (BANNED_FONTS_SET.has(font.trim().toLowerCase())) {
      findings.push({
        domain: "CRITIC_04_DESIGN_CONSTITUTION",
        code: "DESIGN_BANNED_FONT_FAMILY",
        severity: "blocker",
        message: `Font '${font}' is banned by Design Constitution v3.1.0-renaissance. Allowed: Geist, Instrument Serif, Geist Mono.`,
      });
    }
  }

  // Check tools against Estate Registry (TRUTH.md §4)
  for (const tool of input.toolsReferenced ?? []) {
    if (RETIRED_TOOLS_SET.has(tool.trim().toLowerCase())) {
      findings.push({
        domain: "CRITIC_04_DESIGN_CONSTITUTION",
        code: "ESTATE_RETIRED_TOOL_REFERENCE",
        severity: "blocker",
        message: `Tool '${tool}' is retired or hold-listed in TRUTH.md / Estate Registry.`,
      });
    }
  }

  // Check commercial & rights truth
  if (
    input.surface === "shop-edition" &&
    input.priceState === "approved" &&
    (!input.humanApproved || !input.rightsVerified)
  ) {
    findings.push({
      domain: "CRITIC_05_RIGHTS_AND_COMMERCE_TRUTH",
      code: "COMMERCE_UNAPPROVED_LIVE_PRICE",
      severity: "blocker",
      message:
        "Shop edition cannot have priceState='approved' without explicit humanApproved=true and rightsVerified=true.",
    });
  }

  const baseScore = input.qualityScoreEstimate ?? 92;
  const blockerCount = findings.filter((f) => f.severity === "blocker").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const computedScore = Math.max(
    0,
    baseScore - blockerCount * 25 - warningCount * 5,
  );

  if (computedScore < 85) {
    findings.push({
      domain: "CRITIC_04_DESIGN_CONSTITUTION",
      code: "QUALITY_BELOW_85_THRESHOLD",
      severity: "blocker",
      message: `Computed quality score (${computedScore}/100) is below the mandatory 85/100 Creative Renaissance threshold.`,
    });
  }

  const finalBlockerCount = findings.filter(
    (f) => f.severity === "blocker",
  ).length;

  return {
    artifactId: input.id,
    examinerSeat: "verity-sloane",
    passed: finalBlockerCount === 0 && computedScore >= 85,
    computedScore,
    blockerCount: finalBlockerCount,
    warningCount,
    findings,
    requiresHumanSignOff: true,
  };
}
