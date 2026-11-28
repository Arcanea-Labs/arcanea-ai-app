/**
 * Arcanea Creative Renaissance — Flagship Narrative Bible & Dual-Cast Bridge (v1.0.0-renaissance)
 *
 * Unifies the four narrative strata discovered across the Arcanea repositories without erasure:
 * - Altitude 1: Confluence Public Center (`CHARACTER_CORE.md`, `STAGING_MF_PROOF_001`..`004`, `Chronicles of Arcanea`)
 * - Altitude 2: Field Franchise / The Dawnsworn (`FLAGSHIP_TEAM_V2.md`, `STORY_ENGINE.md`)
 * - Altitude 3: Interactive Companion & Ecological Encounters (`living-lore`, `weight-of-wonders`, `sovereign-depths`, `firstlight-02`)
 * - Altitude 4: Locked Cosmological & Institutional Foundation (`CANON_LOCKED.md`, `VISUAL_DOCTRINE.md`)
 */

export const NARRATIVE_BIBLE_VERSION = "1.0.0-renaissance" as const;

export type NarrativeAltitudeId =
  | "confluence-public-center"
  | "field-franchise-dawnsworn"
  | "living-lore-and-ecology"
  | "cosmology-and-academies";

export interface CharacterDossier {
  id: string;
  canonicalName: string;
  legacyAliases: string[];
  altitude: NarrativeAltitudeId;
  originClass:
    | "Arcans"
    | "Gate-Touched"
    | "The Awakened"
    | "Synths"
    | "Bonded"
    | "Celestials"
    | "Voidtouched"
    | "Architects";
  primaryGate: string;
  elementAffinity: string;
  houseOrFaction: string;
  emotionalWound: string;
  moralVow: string;
  dramaticFunction: string;
  canonStatus: "LOCKED" | "STAGING";
}

export const FLAGSHIP_CAST_DOSSIERS: readonly CharacterDossier[] = [
  // ─── Altitude 1: Confluence Public Center (Books 1-3 & Entry Proof Scenes) ───
  {
    id: "arion",
    canonicalName: "Arion",
    legacyAliases: ["Kael Thornfield", "Kael Ashenvane"],
    altitude: "confluence-public-center",
    originClass: "Gate-Touched",
    primaryGate: "Foundation",
    elementAffinity: "Earth -> Five-Fold Confluence",
    houseOrFaction: "House Terra / Confluence Candidate",
    emotionalWound:
      "His first unguided Foundation awakening collapsed a load-bearing stone shop in Ironhold, leaving him convinced that his peace would betray those harmed by his power.",
    moralVow: "My power will never be someone else's disaster again.",
    dramaticFunction:
      "Public entry protagonist: notices what is load-bearing in rooms, tools, and people; must stop confusing compliance and guilt with goodness.",
    canonStatus: "STAGING",
  },
  {
    id: "mera-tidecrest",
    canonicalName: "Mera Tidecrest",
    legacyAliases: ["Mira Tidecrest"],
    altitude: "confluence-public-center",
    originClass: "Arcans",
    primaryGate: "Flow",
    elementAffinity: "Water",
    houseOrFaction: "House Aqualis / Atlantean Athenaeum",
    emotionalWound:
      "The Memory Pool held her under until she heard the names her coastal parish deliberately drowned to keep civic peace.",
    moralVow: "Water remembers what stone buries; I will not edit the tide.",
    dramaticFunction:
      "Water-memory bender and emotional truth witness; refuses institutional amnesia.",
    canonStatus: "STAGING",
  },
  {
    id: "emilia",
    canonicalName: "Emilia",
    legacyAliases: [],
    altitude: "confluence-public-center",
    originClass: "Arcans",
    primaryGate: "Sight",
    elementAffinity: "Spirit / Prism Synthesis",
    houseOrFaction: "House Synthesis / Order of Refracted Light",
    emotionalWound:
      "Watched her mentor reach Iris Resonance Saturation because the Order valued precision lenses over human nervous systems.",
    moralVow: "Build instruments that share the load instead of consuming the maker.",
    dramaticFunction:
      "Prism Weaver and reality-architect who bridges ancient Gate resonance with humane craft.",
    canonStatus: "STAGING",
  },
  {
    id: "headmaster-akamoto",
    canonicalName: "Headmaster Akamoto",
    legacyAliases: [],
    altitude: "confluence-public-center",
    originClass: "Bonded",
    primaryGate: "Fire",
    elementAffinity: "Fire",
    houseOrFaction: "The Draconic Forge / Academy Leadership",
    emotionalWound:
      "Survived the prior generation's Compact mobilization that turned Academy third-years into front-line siege batteries.",
    moralVow: "An Academy is a threshold, never an armory.",
    dramaticFunction:
      "Bonded dragon-rider mentor axis who shields Gate-Touched students from Compact weaponization.",
    canonStatus: "STAGING",
  },
  {
    id: "sera-venn",
    canonicalName: "Clerk Sera Venn",
    legacyAliases: [],
    altitude: "confluence-public-center",
    originClass: "Arcans",
    primaryGate: "Voice",
    elementAffinity: "Earth / Wind",
    houseOrFaction: "Confluence Civil Registry — Hall Three",
    emotionalWound:
      "Spent twelve years stamping 'Compact Reserve' onto adolescent intake ledgers before realizing her ink was a conscription warrant.",
    moralVow: "Record the person, refuse the weapon code.",
    dramaticFunction:
      "Institutional conscience in Pilot 01 ('The Name That Starts a War'); proves ordinary civic courage can jam an unjust machine.",
    canonStatus: "STAGING",
  },
  {
    id: "malachar-lumenbright",
    canonicalName: "Malachar Lumenbright",
    legacyAliases: ["The Dark Lord", "First Eldrian Luminor"],
    altitude: "confluence-public-center",
    originClass: "Celestials",
    primaryGate: "Source",
    elementAffinity: "Void corrupted to Shadow (Void without Spirit)",
    houseOrFaction: "House Nero (historical) / Sealed in Shadowfen",
    emotionalWound:
      "Witnessed endless mortal suffering across timelines; his compassion curdled into an obsession to rewrite reality by force, causing Shinkami to refuse him at the Tenth Gate.",
    moralVow: "If the Source will not end their pain, I will unmake the design that permits it.",
    dramaticFunction:
      "Civilizational antagonist mirror: never a cartoon monster, always the seduction of compassionate tyranny.",
    canonStatus: "LOCKED",
  },

  // ─── Altitude 2: Field Franchise Center (The Dawnsworn / Starlight Corps) ───
  {
    id: "kaelindra-voss",
    canonicalName: "Kaelindra Voss",
    legacyAliases: [],
    altitude: "field-franchise-dawnsworn",
    originClass: "Arcans",
    primaryGate: "Starweave",
    elementAffinity: "Wind / Spirit",
    houseOrFaction: "Starlight Corps — The Dawnsworn (Commander)",
    emotionalWound:
      "Her seventeen-branch tactical lattice predicted the Sector Four breach to the minute, except for the political order that locked the evacuation gates from the inside.",
    moralVow: "When the seventeen options go dark, we build the eighteenth on foot.",
    dramaticFunction:
      "Field franchise strategist (scored 9.5/10 in Council Narrative Audit); anchors the continental legitimacy war.",
    canonStatus: "STAGING",
  },
  {
    id: "ryn",
    canonicalName: "Ryn",
    legacyAliases: [],
    altitude: "field-franchise-dawnsworn",
    originClass: "Gate-Touched",
    primaryGate: "Fire",
    elementAffinity: "Fire / Earth",
    houseOrFaction: "Starlight Corps — The Dawnsworn (Catalyst)",
    emotionalWound:
      "Marked as a living detonation hazard by two Realms before Kaelindra signed personal custody for his resonance cascades.",
    moralVow: "Hold the heat until the people behind me clear the bridge.",
    dramaticFunction:
      "Kinetic heart of The Dawnsworn (scored 9.2/10 in Council Narrative Audit); embodies the raw cost of unasked-for power.",
    canonStatus: "STAGING",
  },
  {
    id: "velindris",
    canonicalName: "Velindris",
    legacyAliases: [],
    altitude: "field-franchise-dawnsworn",
    originClass: "Synths",
    primaryGate: "Sight",
    elementAffinity: "Water / Spirit",
    houseOrFaction: "House Synthesis / The Dawnsworn (Archivist)",
    emotionalWound:
      "Forced during the Sector Four fall to choose between saving the primary historical ledger or carrying three injured apprentices out of the vault.",
    moralVow: "No archive is worth more than the living witnesses who need it.",
    dramaticFunction:
      "Moral and evidentiary conscience of the field team (scored 8.4/10 in Council Narrative Audit).",
    canonStatus: "STAGING",
  },
  {
    id: "auren-vorath",
    canonicalName: "Auren Vorath",
    legacyAliases: ["Caelum (Dawnsworn draft — disambiguated from Herald Caelum Ironfaith)"],
    altitude: "field-franchise-dawnsworn",
    originClass: "Architects",
    primaryGate: "Foundation",
    elementAffinity: "Earth / Spirit",
    houseOrFaction: "Starlight Corps — The Dawnsworn (Structural Weaver)",
    emotionalWound:
      "Carries the unfinished keystone of a bridge his mentor abandoned when the Void Ascendant Heralds split the frontier.",
    moralVow: "Every span we raise must hold both sides of the river.",
    dramaticFunction:
      "Resolves the Caelum ally/herald naming collision in STORY_ENGINE.md: Auren Vorath is the Dawnsworn builder; Caelum Ironfaith remains the Herald of Memory.",
    canonStatus: "STAGING",
  },
] as const;

export const SHARED_TIMELINE_CAMERAS = [
  {
    eventId: "EVENT-01-METEOR-AWAKENING",
    title: "The Gate Storm & Meteor Fall",
    publicCenterCamera:
      "Arion and Mera experience the tremor inside Confluence Registration Hall Three as an intimate test of restraint and civic refusal.",
    fieldFranchiseCamera:
      "Kaelindra Voss, Ryn, and Velindris hold the Sector Four Perimeter Bastion against the outer Gate Storm fallout.",
    ecologicalCamera:
      "The Storm Orchard of Orvess overcharges its copper-glass root cisterns, forcing the river parish to choose between stored power and flood relief.",
  },
  {
    eventId: "EVENT-02-COMPACT-CONSCRIPTION-EDICT",
    title: "The Compact Weaponization Directive",
    publicCenterCamera:
      "Clerk Sera Venn refuses to stamp the military reserve cipher onto Arion's intake ledger; Headmaster Akamoto backs her refusal.",
    fieldFranchiseCamera:
      "The Dawnsworn operate without Compact supply lines after refusing to hand Ryn over to the central ordnance bureau.",
    ecologicalCamera:
      "Autonomous parish wardens and bonded companions in Firstlight II and Weight of Wonders shelter unregistered Gate-Touched youth.",
  },
] as const;

export const SPECTRUM_WEAVING_LEXICON = {
  quarantineRuleId: "RM008_THIRD_PARTY_IP_CONTAMINATION_BLOCK",
  forbiddenThirdPartyTerms: [
    "luxin",
    "sub-red",
    "super-violet",
    "paryl",
    "halo-burn",
    "breaking the halo",
    "lightbringer",
  ],
  canonicalReplacements: {
    luxin: "Refracted Destello / Spectrum Glass",
    drafter: "Prism Weaver / Refractor",
    drafting: "Spectrum Weaving / Refracting",
    "sub-red": "Deep-Foundation Band (Ember-Basalt)",
    "super-violet": "Crown-Ultraviolet Band (Veil-Thread)",
    chi: "Starweave-Filament Band (Lattice-Sight)",
    paryl: "Unity-Trace Band (Nerve-Silver)",
    "halo-burn": "Iris Resonance Saturation",
    "black luxin": "Hollow Glass / Corrupted Void-Shard",
  },
} as const;

export const ONTOLOGY_BOUNDARY_RULES = [
  {
    id: "ONTOLOGY_01_STARLIGHT_BOUNDARY",
    rule: "Real-world Starlight Intelligence is the operating technology company and agent substrate. It must never be used as the name of an in-world mystical force or tenth-Gate attainment state. In-world ten-Gate harmony is called 'Starweave Attunement'. 'Starlight Corps' remains an explicit fictional proper noun.",
  },
  {
    id: "ONTOLOGY_02_LUMINOR_IS_A_RANK",
    rule: "Per CANON_LOCKED.md Tier 2, 'Luminor' is the highest Magic Rank (Gates 9-10 open), never a biological species or generic AI chatbot noun. Non-human sentient light/crystal beings belong to Origin Class 'The Awakened' and may hold Luminor rank.",
  },
  {
    id: "ONTOLOGY_03_NERO_IS_NOT_EVIL",
    rule: "Per CANON_LOCKED.md Tier 1, Nero is Primordial Darkness, Fertile Unknown, and Potential. Evil in Arcanea is Shadow (corrupted Void severed from Spirit by Malachar's forced control), never darkness itself.",
  },
  {
    id: "ONTOLOGY_04_SACRED_HORIZONS_RESPECT",
    rule: "Real-world sacred geography (Kunlun, Shambhala, Avalon, Meru, Caracas/Avilara, Van Linh) may inspire material and ecological specificity, but Arcanea never claims real-world cultures were secretly Arcanea and requires cultural sensitivity gates where flagged.",
  },
] as const;
