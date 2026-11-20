/**
 * Arcanea Creative Renaissance — Versioned Design Constitution (v3.1.0-renaissance)
 *
 * Reconciles the four historical design specifications across the Arcanea estate:
 * 1. `packages/design-system/src/tokens.ts` (Cosmic Dark palette & glass tiers)
 * 2. `TASTE.md` (AI-lab dark chrome vs. cosmic content discipline, Phosphor icons, Geist typography)
 * 3. `.arcanea/config/design-tokens.yaml` (HSL semantic tokens)
 * 4. `.arcanea/lore/VISUAL_DOCTRINE.md` & `.arcanea/lore/GUARDIAN_VISUAL_CANON_AUDIT.md`
 *
 * Authority: STAGING -> Ready for Creator lock. Enforced by `runIndependentCriticalReview()`.
 */

export const DESIGN_CONSTITUTION_VERSION = "3.1.0-renaissance" as const;

export type SurfaceModeId =
  | "product-ui"
  | "prism-realism"
  | "cel-cinematic"
  | "codex-graphic";

export interface SurfaceModeSpec {
  id: SurfaceModeId;
  name: string;
  ratioFormula: string;
  primarySurfaces: string[];
  backgroundTokens: {
    void: string;
    deep: string;
    surface: string;
    elevated: string;
  };
  accentTokens: {
    primaryTeal: string;
    secondaryBlue: string;
    canonGold: string;
    successAquamarine: string;
  };
  lightingAndMaterialRules: string[];
  forbiddenPatterns: string[];
}

export const SURFACE_MODES: Record<SurfaceModeId, SurfaceModeSpec> = {
  "product-ui": {
    id: "product-ui",
    name: "AI-Lab Dark Chrome (Product UI)",
    ratioFormula: "92% neutral dark chrome / 8% semantic cosmic accent",
    primarySurfaces: [
      "apps/web navigation, chat, studio shells, pricing, shop, account",
      "starlight-creator-command operator cockpit",
      "arcanea-studio model router controls",
    ],
    backgroundTokens: {
      void: "#0b0e14",
      deep: "#121826",
      surface: "#1a2332",
      elevated: "#232f42",
    },
    accentTokens: {
      primaryTeal: "#00bcd4",
      secondaryBlue: "#0d47a1",
      canonGold: "#ffd700",
      successAquamarine: "#7fffd4",
    },
    lightingAndMaterialRules: [
      "Chrome stays neutral (#09090b to #121826); artwork and world cards supply the color.",
      "One subtle radial glow per viewport maximum (opacity <= 0.08).",
      "Phosphor duotone SVG icons only; mark is arcanea-mark.jpg.",
      "Sentence case for all navigation, buttons, and section headers.",
    ],
    forbiddenPatterns: [
      "Purple-gradient-on-white SaaS templates",
      "Neon cyberpunk magenta/cyan overdrive",
      "Unicode glyphs (✦ ◈ ⌥ ✶ ⎈) or emojis used as UI icons",
      "Raw Solfeggio Hz frequencies (174 Hz - 1111 Hz) in user-facing labels",
      "More than two gradient systems in a single viewport",
    ],
  },
  "prism-realism": {
    id: "prism-realism",
    name: "Arcanean Prism Realism (Flagship World & Live-Action Cinema)",
    ratioFormula: "75% physical cinema / 25% anime silhouette & ocular lighting intelligence",
    primarySurfaces: [
      "Chronicles of Arcanea book covers and chapter plates",
      "Pilot 01: The Name That Starts a War",
      "Firstlight II and Sovereign Depths key art",
    ],
    backgroundTokens: {
      void: "#0b0e14",
      deep: "#121826",
      surface: "#1a2332",
      elevated: "#232f42",
    },
    accentTokens: {
      primaryTeal: "#00bcd4",
      secondaryBlue: "#0d47a1",
      canonGold: "#ffd700",
      successAquamarine: "#7fffd4",
    },
    lightingAndMaterialRules: [
      "Materials carry labor and mineral wear: load-bearing basalt, coral-pink volcanic stone, salt-stained linen, repaired iron.",
      "Magic manifests as Refracted Destello (crystalline light caustics and Iris Resonance Rings) with physical weight and heat cost.",
      "Human faces preserve asymmetrical pores, calluses, and lived fatigue — never airbrushed plastic.",
    ],
    forbiddenPatterns: [
      "Generic stock midjourney elf/wizard robes with meaningless glowing runes",
      "Weightless particle soup without a physical light source",
      "Plastic sci-fi armor or symmetric marvel-style bodysuits",
    ],
  },
  "cel-cinematic": {
    id: "cel-cinematic",
    name: "Cel-Cinematic (Contemporary Anime Production Mode)",
    ratioFormula: "65% sakuga keyframe graphic clarity / 35% atmospheric multi-plane depth",
    primarySurfaces: [
      "AnimeLegends x Arcanea Remotion shorts",
      "Pilot 02: Dawn Over Sector Four (The Dawnsworn)",
      "Trinity mascot bumpers (Mira -> Kage -> Akashi)",
    ],
    backgroundTokens: {
      void: "#0b0e14",
      deep: "#121826",
      surface: "#1a2332",
      elevated: "#232f42",
    },
    accentTokens: {
      primaryTeal: "#00bcd4",
      secondaryBlue: "#0d47a1",
      canonGold: "#ffd700",
      successAquamarine: "#7fffd4",
    },
    lightingAndMaterialRules: [
      "Sharp graphic shadow shapes with deliberate 2s/3s hold frames before kinetic release.",
      "Background plates painted with mineral and architectural specificity (Arcanea Infogenius).",
      "Original IP character sheets only — zero frames, poses, or traces from copyrighted anime.",
    ],
    forbiddenPatterns: [
      "Ripped or img2img frames from copyrighted anime studios",
      "Named living anime directors or studios in public prompts",
      "Chibi/mascotproportions in flagship dramatic scenes",
    ],
  },
  "codex-graphic": {
    id: "codex-graphic",
    name: "Codex Graphic (In-World Archival & Cartographic Mode)",
    ratioFormula: "80% architectural & cartographic diagram / 20% gold-leaf & teal telemetry",
    primarySurfaces: [
      "Athenaeum field manuals and Worldbuilder Production Edition plates",
      "Pilot 03: The Storm Orchard of Orvess watershed schematic",
      "Ten Gates & Godbeast Chord structural diagrams",
    ],
    backgroundTokens: {
      void: "#0b0e14",
      deep: "#121826",
      surface: "#1a2332",
      elevated: "#232f42",
    },
    accentTokens: {
      primaryTeal: "#00bcd4",
      secondaryBlue: "#0d47a1",
      canonGold: "#ffd700",
      successAquamarine: "#7fffd4",
    },
    lightingAndMaterialRules: [
      "High-contrast vector linework in Arcanean Gold (#ffd700) and Atlantean Teal (#00bcd4) over Cosmic Void (#0b0e14).",
      "Every diagram explains a working physical or institutional mechanism (watersheds, load-bearing chords, Gate thresholds).",
    ],
    forbiddenPatterns: [
      "Decorative esoteric mandalas with no in-world structural meaning",
      "Illegible pseudo-Latin filler text",
    ],
  },
};

export const TYPOGRAPHY_CONSTITUTION = {
  allowedFamilies: {
    display: "Geist",
    sans: "Geist",
    editorialAccent: "Instrument Serif",
    mono: "Geist Mono",
  },
  bannedFamilies: [
    "Cinzel",
    "Space Grotesk",
    "Inter",
    "Arial",
    "Roboto",
    "Newsreader",
    "Plus Jakarta Sans",
  ],
  rules: [
    "Geist handles all UI chrome, headings, and body copy.",
    "Instrument Serif is reserved strictly for short editorial emphasis (1-4 words in italics) and book pull-quotes.",
    "Geist Mono handles SKU codes, coordinates, timestamps, and SHA-256 provenance hashes.",
  ],
} as const;

export const FRANCHISE_VISUAL_EQUATION = [
  "CLEAN_EMBLEM",
  "HEROIC_PRESENCE",
  "ONE_BEAST_ANCHOR",
  "ONE_TECH_ANCHOR",
  "ONE_CELESTIAL_ANCHOR",
  "GOLD_LIGHT_DNA",
] as const;

export type GodbeastReadiness =
  | "morphology-grounded-candidate"
  | "discovery-only"
  | "blocked-by-contradiction";

export interface GodbeastMorphologySpec {
  id: string;
  name: string;
  gateIndex: number;
  gateName: string;
  guardianId: string;
  guardianName: string;
  chordCount: number;
  readiness: GodbeastReadiness;
  canonicalFormTitle: string;
  morphologyDirective: string;
  forbiddenClichés: string[];
}

export const GODBEAST_MORPHOLOGY_LOCKS: readonly GodbeastMorphologySpec[] = [
  {
    id: "kaelith",
    name: "Kaelith",
    gateIndex: 1,
    gateName: "Foundation",
    guardianId: "lyssandria",
    guardianName: "Lyssandria",
    chordCount: 1,
    readiness: "discovery-only",
    canonicalFormTitle: "The Ringback",
    morphologyDirective:
      "Colossal stone-and-basalt wyrm closed into a load-bearing annulus with six load-limbs and a recessed face inside the ring; redistributes seismic and structural weight.",
    forbiddenClichés: ["Generic four-legged earth golem", "Humanoid rock giant"],
  },
  {
    id: "veloura",
    name: "Veloura",
    gateIndex: 2,
    gateName: "Flow",
    guardianId: "leyla",
    guardianName: "Leyla",
    chordCount: 2,
    readiness: "morphology-grounded-candidate",
    canonicalFormTitle: "The Phoenix-Serpent",
    morphologyDirective:
      "Bioluminescent pelagic serpent with twin thermal-plume wings where steam and deep-current memory braid into two counter-rotating chords.",
    forbiddenClichés: ["Standard western fire-phoenix", "Generic sea monster"],
  },
  {
    id: "draconis",
    name: "Draconis",
    gateIndex: 3,
    gateName: "Fire",
    guardianId: "draconia",
    guardianName: "Draconia",
    chordCount: 3,
    readiness: "discovery-only",
    canonicalFormTitle: "The Solar Crucible",
    morphologyDirective:
      "Wingless six-limbed volcanic progenitor with an open furnace ribcage housing three suspended solar-slag chords; moves with deliberate industrial-geological mass.",
    forbiddenClichés: ["Winged European wyvern", "Generic red fantasy dragon"],
  },
  {
    id: "laeylinn",
    name: "Laeylinn",
    gateIndex: 4,
    gateName: "Heart",
    guardianId: "maylinn",
    guardianName: "Maylinn",
    chordCount: 4,
    readiness: "morphology-grounded-candidate",
    canonicalFormTitle: "The Worldtree Stag",
    morphologyDirective:
      "Ancient canopy cervine whose four-branched root-antlers graft directly into living timber and mycelial networks to redistribute ecological shock.",
    forbiddenClichés: ["Glowing neon patronus deer", "Cutesy forest mascot"],
  },
  {
    id: "otome",
    name: "Otome",
    gateIndex: 5,
    gateName: "Voice",
    guardianId: "alera",
    guardianName: "Alera",
    chordCount: 5,
    readiness: "discovery-only",
    canonicalFormTitle: "The Resonance Crest",
    morphologyDirective:
      "High-altitude acoustic avian-cetacean form with five articulated bronze-feather tuning vanes that make pressure waves visible in cold air.",
    forbiddenClichés: ["Talking parrot", "Generic harpy"],
  },
  {
    id: "yumiko",
    name: "Yumiko",
    gateIndex: 6,
    gateName: "Sight",
    guardianId: "lyria",
    guardianName: "Lyria",
    chordCount: 6,
    readiness: "discovery-only",
    canonicalFormTitle: "The Loom-Owl Serpent",
    morphologyDirective:
      "Nocturnal owl-serpent chimera with six ocular aperture rings that refract unseen trajectories without theatrical crystal-ball tropes.",
    forbiddenClichés: ["Snowy owl on a wizard shoulder", "Floating eyeball monster"],
  },
  {
    id: "sol",
    name: "Sol",
    gateIndex: 7,
    gateName: "Crown",
    guardianId: "aiyami",
    guardianName: "Aiyami",
    chordCount: 7,
    readiness: "blocked-by-contradiction",
    canonicalFormTitle: "The Sevenfold Zenith (Blocked Pending Canon Reconciliation)",
    morphologyDirective:
      "Blocked from public render until Creator resolves the local Godbeast record contradiction between feline-solar and geometric-heliostat descriptions.",
    forbiddenClichés: ["Lion with fire mane", "Generic angel"],
  },
  {
    id: "vaelith",
    name: "Vaelith",
    gateIndex: 8,
    gateName: "Starweave",
    guardianId: "elara",
    guardianName: "Elara",
    chordCount: 8,
    readiness: "discovery-only",
    canonicalFormTitle: "The Astral Weaver",
    morphologyDirective:
      "Eight-limbed dimensional arachnid-cephalopod construct whose translucent tendons tension the geometry between adjacent perspectives.",
    forbiddenClichés: ["Horror spider", "Portal vortex blob"],
  },
  {
    id: "kyuro",
    name: "Kyuro",
    gateIndex: 9,
    gateName: "Unity",
    guardianId: "ino",
    guardianName: "Ino",
    chordCount: 9,
    readiness: "discovery-only",
    canonicalFormTitle: "The Bridge-Beast",
    morphologyDirective:
      "Colossal living viaduct with two opposite-facing sensory heads and eight load-bearing pillar-limbs spanning chasms only when both ends consent.",
    forbiddenClichés: ["Two-headed attack hydra", "Twin wolves"],
  },
  {
    id: "source",
    name: "Source",
    gateIndex: 10,
    gateName: "Source",
    guardianId: "shinkami",
    guardianName: "Shinkami",
    chordCount: 10,
    readiness: "blocked-by-contradiction",
    canonicalFormTitle: "The Unrefracted Threshold (Blocked Pending Canon Reconciliation)",
    morphologyDirective:
      "Blocked from direct creature depiction; manifests only as the ten-chord acoustic and prismatic convergence of the preceding nine Gates.",
    forbiddenClichés: ["Giant glowing humanoid deity", "Final boss monster"],
  },
] as const;

export const GUARDIAN_VISUAL_STAGING_POLICY = {
  sourceAudit: ".arcanea/lore/GUARDIAN_VISUAL_CANON_AUDIT.md",
  status: "STAGING_TURNAROUND_REQUIRED" as const,
  lockedAttributes: [
    "Guardian name",
    "Gate name (Foundation through Source, with Gate 8 locked as Starweave)",
    "Backend Solfeggio reference integer (174 through 1111)",
    "Elemental and Wisdom domain",
    "Bonded Godbeast pairing",
  ],
  pendingTurnaroundAttributes: [
    "Humanoid facial structure and apparent age",
    "Gender presentation across the 10-Guardian set",
    "Garment silhouette and cultural material language",
  ],
  publicSurfaceRule:
    "Do not publish a definitive 10-Guardian humanoid council group portrait until Creator turnaround sign-off. Use Gate architectural monuments, Godbeast grounded studies, and named mortal Academy faculty (Headmaster Akamoto, Archon Celestine Halcyon, Warden Theron Ashcroft, Instructor Sevirath Thalorn) on public product surfaces.",
} as const;
