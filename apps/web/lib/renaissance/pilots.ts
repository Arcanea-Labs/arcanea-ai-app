/**
 * Arcanea Creative Renaissance — Three Cinematic Pilot Packages (v1.0.0-renaissance)
 *
 * Bridges the four workstreams (Mythology Architect, Celestial Art Director,
 * Cultural Communications Director, Starlight Production Engineer) into three
 * bounded, multi-format pilot packages ready for:
 * - `Arcanea-Labs/AnimeLegends` (Remotion v4 compositions + 24-task flagship recipe)
 * - `Arcanea-Labs/arcanea-studio` (Cinema Studio + Image/Video model router)
 * - `frankxai/starlight-creator-command` (HMAC human-approved storyboard & export slice)
 */

import type { SurfaceModeId } from "./constitution";
import type { NarrativeAltitudeId } from "./narrative-bible";

export interface PilotShotSpec {
  shotNumber: number;
  durationSec: number;
  cameraAndLens: string;
  visualAction: string;
  lightingAndColor: string;
  dialogueOrVoiceover: string;
  soundAndMusicCue: string;
  imageGenerationPrompt: string;
  negativePrompt: string;
}

export interface PilotAudioScoreBrief {
  trackTitle: string;
  composerCredit: string;
  sunoStyleVoice: string;
  bpm: number;
  keySignature: string;
  instrumentation: string[];
  emotionalArc: string;
  canonGateAssociation: string;
  publicCopyHzLeakCheck: "PASSED_ZERO_HZ_STRINGS";
}

export interface CinematicPilotPackage {
  pilotId: string;
  slug: string;
  title: string;
  subtitle: string;
  visualMode: SurfaceModeId;
  narrativeAltitude: NarrativeAltitudeId;
  runtimeSec: number;
  aspectRatios: readonly ("16:9" | "9:16" | "2.39:1")[];
  logline: string;
  emotionalPremise: string;
  sourceLoreRefs: string[];
  castIds: string[];
  remotionTemplateId: string;
  trinityFraming?: {
    miraOpening: string;
    kageMeasurement: string;
    akashiClosing: string;
  };
  interactiveChoices?: Array<{
    choiceId: string;
    prompt: string;
    consequence: string;
  }>;
  audioScore: PilotAudioScoreBrief;
  shots: readonly PilotShotSpec[];
  economics: {
    storyboardSliceCostUsd: number;
    estimatedFullRenderCostUsd: number;
    targetRuntimeEngine: string;
  };
  governance: {
    productionState: "planned-awaiting-human-render-gate";
    rightsVerificationState: "draft-requires-per-asset-sha256-on-render";
    approverRequired: "human:frank";
  };
}

export const CINEMATIC_PILOT_PACKAGES: readonly CinematicPilotPackage[] = [
  // ─── PILOT 01: PRISM REALISM / CONFLUENCE PUBLIC CENTER ───────────────────
  {
    pilotId: "PILOT-001-NAME-STARTS-WAR",
    slug: "the-name-that-starts-a-war",
    title: "The Name That Starts a War",
    subtitle: "Confluence Registration Hall Three",
    visualMode: "prism-realism",
    narrativeAltitude: "confluence-public-center",
    runtimeSec: 90,
    aspectRatios: ["2.39:1", "16:9", "9:16"],
    logline:
      "At a municipal intake desk where Gate-Touched nineteen-year-olds are quietly classified as military ordnance, a tired civil clerk and a guilt-ridden stone-worker's son refuse the stamp.",
    emotionalPremise:
      "Power in Arcanea is measured not by how much stone you can shatter, but by what you refuse to break when the room flinches.",
    sourceLoreRefs: [
      ".arcanea/lore/scenes/STAGING_MF_PROOF_001_REGISTRATION_REFUSE.md",
      ".arcanea/lore/CHARACTER_CORE.md",
      ".arcanea/lore/DUAL_CAST_BRIDGE.md",
    ],
    castIds: ["arion", "mera-tidecrest", "sera-venn"],
    remotionTemplateId: "lore-drop-short",
    audioScore: {
      trackTitle: "Foundation Stone & Copper Bell",
      composerCredit: "FrankX / Arcanea Soundworks",
      sunoStyleVoice: "Arcanean Chamber Acoustic & Deep Sub-Bass",
      bpm: 66,
      keySignature: "D Minor",
      instrumentation: [
        "Solo close-mic cello",
        "Struck basalt slate percussion",
        "Bowed copper waterphone",
        "Low choir breath pad",
      ],
      emotionalArc:
        "Begins in dry bureaucratic silence; builds to a sub-audible stone tremor held in check; resolves on a single warm cello fifth when the red ordnance stamp is set down unused.",
      canonGateAssociation: "Foundation (Lyssandria) & Voice (Alera)",
      publicCopyHzLeakCheck: "PASSED_ZERO_HZ_STRINGS",
    },
    shots: [
      {
        shotNumber: 1,
        durationSec: 14,
        cameraAndLens: "50mm anamorphic, locked tripod at desk height, shallow depth of field",
        visualAction:
          "Clerk Sera Venn's ink-stained fingers align two brass stamps beside a wet ledger page: 'CIVIC APPRENTICE' in tarnished bronze and 'COMPACT RESERVE ORDNANCE' in red iron. Arion's scarred left thumb rests on the basalt counter edge.",
        lightingAndColor:
          "Cold north-window slate light (#121826) cut by a single warm tungsten desk lamp (#ffd700) reflecting off wet copper ink.",
        dialogueOrVoiceover:
          "SERA VENN: 'State your name, your parish of origin, and whether the tremor at Ironhold was witnessed by a licensed magistrate.'",
        soundAndMusicCue: "Scratch of nib on heavy cotton ledger paper; distant harbor bell.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 50mm anamorphic film still, close-up on a weathered basalt civic registration counter, two brass stamps beside an open linen ledger, a nineteen-year-old craftsman's calloused dark-brown hand with a small white thumb scar resting calmly on the stone, slate morning light and warm amber desk lamp, tactile mineral wear, cinematic depth.",
        negativePrompt:
          "glowing neon magic runes, wizard robes, plastic sci-fi UI, oversaturated purple, anime chibi, watermark, text overlay",
      },
      {
        shotNumber: 2,
        durationSec: 15,
        cameraAndLens: "35mm close medium shot on Arion, eye-level, subtle handheld breathing",
        visualAction:
          "Arion keeps his broad shoulders compressed to take up less room in the narrow hall. Behind him on the wet bench, Mera Tidecrest twists her mother's braided fishing cord around her wrist, watching the armed Compact bailiff by the door.",
        lightingAndColor:
          "Deep void shadows (#0b0e14) behind the bench; Atlantean teal rain-light (#00bcd4) catching the wet wool of Mera's coat.",
        dialogueOrVoiceover:
          "ARION: 'Arion of Ironhold. My father's shop took the load when the seam gave way. Nobody else was inside.'",
        soundAndMusicCue: "Low solo cello drone enters on D2; rain against leaded glass.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 35mm cinematic portrait of a nineteen-year-old young man with warm deep-brown skin, close-cropped hair, watchful dark eyes, wearing worn grey linen work clothes in a stone registry hall; in soft-focus background a young woman with salt-waved dark hair and a fishing cord on her wrist watches an armored bailiff, moody slate and teal rain light.",
        negativePrompt:
          "superhero costume, glowing eyes, floating particles, generic fantasy elf, plastic skin",
      },
      {
        shotNumber: 3,
        durationSec: 16,
        cameraAndLens: "85mm macro insert on the copper resonance dish on the counter",
        visualAction:
          "The bailiff steps forward, boots ringing on the flagstone. A micro-tremor passes through the hall floor — dust motes rise half an inch from the mortar, and concentric standing waves appear in the copper dish of water. Every adult in the room flinches backward before Arion even moves.",
        lightingAndColor:
          "Refracted Destello amber caustics (#ffd700) trembling inside the copper water dish against dark basalt.",
        dialogueOrVoiceover:
          "MERA (quietly): 'Look at their hands, Arion. They were afraid of you before you walked through the door.'",
        soundAndMusicCue: "Sub-bass stone resonance swells; copper dish rings once like a singing bowl.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 85mm macro shot of a hammered copper dish filled with clear water on a dark basalt counter, geometric concentric standing wave ripples catching warm gold caustic light, tiny stone dust motes suspended half an inch above the counter, extreme physical realism.",
        negativePrompt:
          "cartoon splash, neon laser beams, CGI fireballs, blurry watermark",
      },
      {
        shotNumber: 4,
        durationSec: 15,
        cameraAndLens: "40mm medium two-shot across the counter profile",
        visualAction:
          "Instead of clenching his fist, Arion places his open palm flat against the cracked mortar seam under the counter edge and exhales. The standing wave in the copper dish flattens immediately to mirror-stillness. He absorbs the building's settling strain into his own forearm.",
        lightingAndColor:
          "A brief hairline seam of warm gold light settles into the stone and vanishes, leaving ordinary daylight.",
        dialogueOrVoiceover:
          "ARION: 'The east pier under your archive is carrying three tons too much water weight from the tide. If you let me shore the timber before I leave, the wall won't crack in winter.'",
        soundAndMusicCue: "The sub-bass tremor stops on a dime; only Arion's steady breath remains.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, medium profile shot in a stone hall, a young craftsman pressing his open calloused palm calmly against a hairline crack in a basalt counter while a middle-aged female civil clerk watches him intently over her spectacles, copper water dish completely mirror-still between them, restrained cinematic lighting.",
        negativePrompt:
          "explosions, glowing superhero aura, melodramatic screaming, oversaturated colors",
      },
      {
        shotNumber: 5,
        durationSec: 15,
        cameraAndLens: "50mm tight close-up on Clerk Sera Venn's eyes and hand",
        visualAction:
          "Sera looks from the bailiff's hand on his baton to the red 'COMPACT RESERVE ORDNANCE' stamp. She picks up the tarnished bronze 'CIVIC APPRENTICE — HOUSE TERRA' stamp instead, presses it firmly into the black ink pad, and stamps Arion's ledger.",
        lightingAndColor:
          "Warm gold desk light catches the brass ferrule as it strikes the page; deep indigo shadows hold the edges.",
        dialogueOrVoiceover:
          "SERA VENN: 'Foundation Apprentice. Assigned to Crystalpeak structural maintenance under Headmaster Akamoto's writ. Next in line.'",
        soundAndMusicCue: "Decisive mechanical thud of brass stamp on paper; cello resolves to an open fifth.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, tight close-up of a weathered civil clerk's hand pressing a bronze stamp onto a heavy cream cotton ledger page beside an untouched red iron stamp, dramatic chiaroscuro lighting in warm gold and deep slate blue.",
        negativePrompt:
          "modern office equipment, ballpoint pen, neon glow, unreadable gibberish text",
      },
      {
        shotNumber: 6,
        durationSec: 15,
        cameraAndLens: "28mm wide crane pull-back through the rain-swept archway of Hall Three",
        visualAction:
          "Arion and Mera step out onto the wet harbour causeway toward the cloud-piercing silhouette of Crystalpeak eight hundred meters above. Inside the window behind them, Sera Venn locks the red ordnance stamp inside her lower drawer.",
        lightingAndColor:
          "Wide atmospheric palette: deep cosmic slate (#0b0e14), Atlantean teal harbour mist (#00bcd4), and first sunlight touching the distant floating peak (#ffd700).",
        dialogueOrVoiceover:
          "TITLE CARD: ARCANEA — THE THREE ACADEMIES. 'Power is not what breaks the stone. It is what bears the weight.'",
        soundAndMusicCue: "Full chamber strings swell with a single clear soprano note and fade into harbour wind.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 28mm wide cinematic establishing shot, two young travelers in practical rain-soaked linen and wool walking along a wet stone harbour causeway at dawn toward a distant mountain whose upper crystalline peak floats eight hundred meters above its root in morning clouds, deep slate, teal mist, and warm gold dawn light.",
        negativePrompt:
          "flying cars, neon signs, generic medieval castle, oversaturated magenta",
      },
    ],
    economics: {
      storyboardSliceCostUsd: 0.13,
      estimatedFullRenderCostUsd: 4.85,
      targetRuntimeEngine: "arcanea-studio (Cinema Studio) + starlight-creator-command approval gate",
    },
    governance: {
      productionState: "planned-awaiting-human-render-gate",
      rightsVerificationState: "draft-requires-per-asset-sha256-on-render",
      approverRequired: "human:frank",
    },
  },

  // ─── PILOT 02: CEL-CINEMATIC / THE DAWNSWORN ANIME SHORT ──────────────────
  {
    pilotId: "PILOT-002-DAWN-SECTOR-FOUR",
    slug: "dawn-over-sector-four",
    title: "Dawn Over Sector Four",
    subtitle: "The Night the Seventeen Options Went Dark",
    visualMode: "cel-cinematic",
    narrativeAltitude: "field-franchise-dawnsworn",
    runtimeSec: 75,
    aspectRatios: ["9:16", "16:9"],
    logline:
      "When a Void Ascendant breach severs Sector Four and collapses Commander Kaelindra Voss's seventeen-branch tactical lattice to zero, she and an unstable Fire catalyst named Ryn must hold the evacuation span by hand.",
    emotionalPremise:
      "Strategy is what you build when the map still works; brotherhood is what remains when every branch reads zero.",
    sourceLoreRefs: [
      ".arcanea/lore/FLAGSHIP_TEAM_V2.md",
      ".arcanea/lore/STORY_ENGINE.md",
      ".arcanea/lore/COUNCIL_NARRATIVE_REPORT.md",
    ],
    castIds: ["kaelindra-voss", "ryn", "velindris", "auren-vorath"],
    remotionTemplateId: "power-scaling-short",
    trinityFraming: {
      miraOpening:
        "MIRA: 'What happens when the smartest strategist in the Starlight Corps runs out of moves?'",
      kageMeasurement:
        "KAGE: 'Seventeen tactical branches modeled. Sixteen severed in forty-two seconds. Civilian evacuation load: four thousand souls. Margin remaining: zero.'",
      akashiClosing:
        "AKASHI: 'They were never called the Dawnsworn because they won the night. They were named for what was still standing when the sun came up.'",
    },
    audioScore: {
      trackTitle: "Open the Arc (Sector Four Reprise)",
      composerCredit: "FrankX / Arcanea Soundworks",
      sunoStyleVoice: "Arcanean Cel-Orchestral Drum & Bass / Hybrid Taiko",
      bpm: 128,
      keySignature: "F# Minor",
      instrumentation: [
        "Polyrhythmic taiko ensemble",
        "Distorted analog Reese bass",
        "Solo viola ostinato",
        "Brass stabs with metallic anvil transients",
      ],
      emotionalArc:
        "Opens with rapid-fire tactical clockwork ticks; drops into vacuum silence when the lattice shatters; erupts into driving 128 BPM orchestral propulsion as Ryn and Kaelindra lock the bridge.",
      canonGateAssociation: "Starweave (Elara) & Fire (Draconia)",
      publicCopyHzLeakCheck: "PASSED_ZERO_HZ_STRINGS",
    },
    shots: [
      {
        shotNumber: 1,
        durationSec: 11,
        cameraAndLens: "Cel-Cinematic dynamic low-angle wide, 24mm equivalent",
        visualAction:
          "Mira's pale-blue spark lens opens onto the Sector Four bastion command deck. Kaelindra Voss stands inside a suspended gold-and-teal Starweave tactical lattice showing seventeen branching evacuation routes across a canyon bridge.",
        lightingAndColor:
          "Crisp cel-shaded shadow blocks (#0b0e14) lit by sharp Starweave teal (#00bcd4) and gold (#ffd700) vector threads.",
        dialogueOrVoiceover:
          "MIRA: 'What happens when the smartest strategist in the Starlight Corps runs out of moves?' / KAGE: 'Seventeen branches modeled. Evacuation load: four thousand.'",
        soundAndMusicCue: "Rapid crystalline telemetry ticks at 128 BPM.",
        imageGenerationPrompt:
          "Contemporary cel-cinematic anime keyframe, original IP character Kaelindra Voss in dark high-collared Starlight Corps coat with five-pointed star emblem standing inside a geometric gold and teal holographic tactical lattice overlooking a rain-lashed stone canyon viaduct at night, sharp graphic shadow shapes, rich painted background.",
        negativePrompt:
          "copyrighted anime characters, generic mecha cockpit, neon pink, chibi, blurry linework",
      },
      {
        shotNumber: 2,
        durationSec: 12,
        cameraAndLens: "Whip-pan to extreme close-up on Kaelindra's irises, 2-second sakuga hold frame",
        visualAction:
          "Hollow Glass ordnance strikes the outer pilings. Inside the lattice, sixteen of the seventeen gold routes turn ash-black and snap one by one in Kaelindra's reflection.",
        lightingAndColor:
          "High-contrast graphic flash: gold threads inverting to stark white-on-black impact frames, then settling into ember red.",
        dialogueOrVoiceover:
          "KAGE: 'Sixteen branches severed in forty-two seconds. Compact High Command orders immediate bridge demolition.'",
        soundAndMusicCue: "Sixteen sharp glass-snap transients followed by a sub-bass vacuum drop.",
        imageGenerationPrompt:
          "Cel-cinematic anime extreme close-up on a female commander's sharp eyes reflecting golden geometric lines snapping into dark ash, stark black-and-white impact frame contrast transitioning to deep void indigo and amber, high-craft sakuga linework.",
        negativePrompt:
          "copy of existing anime character, glossy 3D render, watermark, text",
      },
      {
        shotNumber: 3,
        durationSec: 13,
        cameraAndLens: "Dutch-angle medium shot on the outer viaduct span",
        visualAction:
          "Ryn kneels on the cracking central keystone, his hands glowing with volatile orange-gold Fire resonance that is beginning to blister the stone and his own sleeves. Velindris braces three injured apprentices behind a refracted blue shield.",
        lightingAndColor:
          "Ember amber and forge gold (#ffd700) clashing against cold storm slate (#121826) and Velindris's cobalt refraction.",
        dialogueOrVoiceover:
          "RYN: 'Commander—if I vent the surge, the span drops! If I hold it, I burn through the keystone!'",
        soundAndMusicCue: "Low distorted bass growl rising in pitch; cracking stone.",
        imageGenerationPrompt:
          "Cel-cinematic anime action frame on a storm-swept stone viaduct, a young male Gate-Touched fighter kneeling with hands pressed into a white-hot cracking stone keystone while molten gold-orange energy arcs across his forearms, behind him an archivist shields civilians with a geometric blue crystal barrier, dramatic rain and ember particles.",
        negativePrompt:
          "dragon ball aura, generic superhero cape, low resolution, deformed hands",
      },
      {
        shotNumber: 4,
        durationSec: 13,
        cameraAndLens: "Tight two-shot, slow-motion 12fps keyframe animation",
        visualAction:
          "Kaelindra steps out of the command post without her tactical lens. She drops to one knee beside Ryn and clamps her bare hand directly over his scorching wrist, routing his raw Fire surge into Auren Vorath's Foundation anchor cables along the bridge parapet.",
        lightingAndColor:
          "Gold-white Starweave filaments braid around Ryn's volatile fire, channeling it down into the bridge's stone ribs.",
        dialogueOrVoiceover:
          "KAELINDRA VOSS: 'Then we don't vent it, Ryn. We make the bridge heavier. Count with me.'",
        soundAndMusicCue: "128 BPM taiko and orchestral brass drop in at full power.",
        imageGenerationPrompt:
          "Cel-cinematic anime close two-shot, a female commander gripping a young fighter's glowing ember-lit wrist with her bare hand, braiding golden-teal geometric light threads into the stone bridge cables beneath them, intense emotional focus, rain evaporating into steam around their hands.",
        negativePrompt:
          "gore, cartoon proportions, neon cyberpunk city, watermark",
      },
      {
        shotNumber: 5,
        durationSec: 13,
        cameraAndLens: "Wide epic tracking shot from canyon floor looking up at the viaduct",
        visualAction:
          "The entire six-arch stone viaduct illuminates from within like a living ribcage of gold and teal as the last civilian convoy crosses above the Shadowfen fog.",
        lightingAndColor:
          "Deep void canyon (#0b0e14) bisected by a single load-bearing arch of Arcanean Gold (#ffd700) and Atlantean Teal (#00bcd4).",
        dialogueOrVoiceover:
          "VELINDRIS: 'Last carriage across the threshold. The span held.'",
        soundAndMusicCue: "Viola ostinato and choir soar over driving percussion.",
        imageGenerationPrompt:
          "Cel-cinematic anime wide architectural shot from a dark canyon floor looking up at a massive six-arch stone viaduct glowing with internal veins of warm gold and teal light as storm clouds break at dawn, epic scale, painted mineral textures.",
        negativePrompt:
          "modern highway bridge, sci-fi spaceships, oversaturated purple",
      },
      {
        shotNumber: 6,
        durationSec: 13,
        cameraAndLens: "Static silhouette horizon shot at first light",
        visualAction:
          "Five figures stand on the scorched parapet as pale dawn breaks over Sector Four. Akashi's cosmic threshold sigil closes the frame.",
        lightingAndColor:
          "Quiet dawn gold (#ffd700) over slate-blue mountains (#121826).",
        dialogueOrVoiceover:
          "AKASHI: 'They were never called the Dawnsworn because they won the night. They were named for what was still standing when the sun came up.'",
        soundAndMusicCue: "Single resonant taiko strike fading into morning wind.",
        imageGenerationPrompt:
          "Cel-cinematic anime wide horizon shot at dawn, five exhausted warriors standing together on a scorched stone bridge parapet overlooking a sea of mountain mist as golden sunrise breaks, restrained mythic atmosphere.",
        negativePrompt:
          "chibi, comic speech bubbles, watermark, neon text",
      },
    ],
    economics: {
      storyboardSliceCostUsd: 0.13,
      estimatedFullRenderCostUsd: 5.4,
      targetRuntimeEngine: "AnimeLegends Remotion v4 (power-scaling-short) + animelegends-gen MCP",
    },
    governance: {
      productionState: "planned-awaiting-human-render-gate",
      rightsVerificationState: "draft-requires-per-asset-sha256-on-render",
      approverRequired: "human:frank",
    },
  },

  // ─── PILOT 03: CODEX GRAPHIC + PRISM REALISM / LIVING LORE ENCOUNTER ──────
  {
    pilotId: "PILOT-003-STORM-ORCHARD-ORVESS",
    slug: "the-storm-orchard-of-orvess",
    title: "The Storm Orchard of Orvess",
    subtitle: "Weight of Wonders — Watershed Encounter I",
    visualMode: "codex-graphic",
    narrativeAltitude: "living-lore-and-ecology",
    runtimeSec: 110,
    aspectRatios: ["16:9", "9:16"],
    logline:
      "High above the Orvess river gorge, a terraced orchard of copper-rooted glass trees harvests lightning to power the upper Academy tiers—until a century storm threatens to burst the lower parish cisterns.",
    emotionalPremise:
      "Every wonder in Arcanea has a watershed cost: someone upstream designs the beauty, and someone downstream pays for the overflow.",
    sourceLoreRefs: [
      "apps/web/lib/visual-encyclopedia/weight-of-wonders.ts",
      ".arcanea/lore/CHARACTER_CORE.md",
      "apps/web/data/arcanea-world-identities.v1.json",
    ],
    castIds: ["mera-tidecrest", "emilia"],
    remotionTemplateId: "philosophy-short",
    interactiveChoices: [
      {
        choiceId: "CHOICE-A-GROUND-THE-SPIRES",
        prompt:
          "Shunt the storm charge through Emilia's synthesis grounding rods into the bedrock, blacking out the upper Athenaeum lamps to spare the lower river parish.",
        consequence:
          "The lower cisterns hold and the orchard glass cools to safe amber, but the Athenaeum Council summons Emilia for unauthorized grid severance.",
      },
      {
        choiceId: "CHOICE-B-OPEN-THE-MEMORY-WEIR",
        prompt:
          "Have Mera Tidecrest open the ancient pre-Compact flood weir, releasing the orchard's stored water memory across the old dry riverbed.",
        consequence:
          "The flood pressure drops without shattering the glass trees, awakening submerged First-Age boundary stones along the Orvess.",
      },
      {
        choiceId: "CHOICE-C-HOLD-BOTH-LOADS",
        prompt:
          "Attempt a dual Flow-and-Sight refraction between Mera and Emilia to step down the voltage across all six terraces simultaneously.",
        consequence:
          "Saves both the parish and the orchard harvest, but leaves Emilia with a permanent silver-blue Iris Resonance Ring.",
      },
    ],
    audioScore: {
      trackTitle: "Rain on Singing Stairs",
      composerCredit: "FrankX / Arcanea Soundworks",
      sunoStyleVoice: "Arcanean Ecological Ambient & Glass Marimba",
      bpm: 84,
      keySignature: "E Minor",
      instrumentation: [
        "Tuned glass marimba and celesta",
        "Distant thunder-sheet sub-bass",
        "Field recording of mountain weir sluices",
        "Solo alto flute",
      ],
      emotionalArc:
        "Begins with precise cartographic glass chimes mapping the river gradient; builds into humid electrostatic tension before resolving into the sound of open sluice gates and clean rain.",
      canonGateAssociation: "Flow (Leyla) & Sight (Lyria)",
      publicCopyHzLeakCheck: "PASSED_ZERO_HZ_STRINGS",
    },
    shots: [
      {
        shotNumber: 1,
        durationSec: 18,
        cameraAndLens: "Codex Graphic orthographic watershed schematic zooming into live terrain",
        visualAction:
          "An Athenaeum archival diagram in Arcanean Gold (#ffd700) and Atlantean Teal (#00bcd4) over Cosmic Void (#0b0e14) traces the Orvess river system from the high Storm Orchard down to the lower stone parish, showing cistern pressure at 94%.",
        lightingAndColor:
          "Vector gold and teal telemetry lines transitioning seamlessly into wet slate mountain terraces.",
        dialogueOrVoiceover:
          "EMILIA: 'The Athenaeum calls it the Storm Orchard. Six hundred glass-bark trees grafted onto copper roots to catch mountain lightning. They never draw the lower parish on the same map.'",
        soundAndMusicCue: "Glass marimba ostinato at 84 BPM; distant thunder roll.",
        imageGenerationPrompt:
          "Arcanean Codex Graphic transitioning to Prism Realism, architectural watershed elevation diagram in fine gold and teal linework on dark obsidian vellum showing six terraced mountain orchards above a river gorge and lower stone village, museum-grade cartographic precision.",
        negativePrompt:
          "modern computer monitor, neon cyberpunk HUD, blurry text, cartoon map",
      },
      {
        shotNumber: 2,
        durationSec: 18,
        cameraAndLens: "32mm wide tracking shot through the terraced glass orchard in heavy rain",
        visualAction:
          "Mera Tidecrest and Emilia walk between rows of gnarled trees whose translucent mineral bark pulses with trapped violet-gold lightning charge, conducting current down into flooded stone cisterns.",
        lightingAndColor:
          "Deep storm indigo (#121826) lit from below by submerged copper conduits (#ffd700) and teal water overflow (#00bcd4).",
        dialogueOrVoiceover:
          "MERA: 'Feel the sluice walls, Emilia. The water isn't just carrying charge—it's carrying the pressure of three locked weirs upstream.'",
        soundAndMusicCue: "Hum of wet high-voltage stone; rushing sluice water.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 32mm cinematic wide shot of two young women walking through a flooded mountain terrace orchard of gnarled translucent glass-bark trees with thick copper roots glowing softly under heavy storm rain, stone water channels overflowing, dark slate sky.",
        negativePrompt:
          "cherry blossom anime cliché, neon pink trees, fairy wings, plastic textures",
      },
      {
        shotNumber: 3,
        durationSec: 18,
        cameraAndLens: "65mm medium shot on the Storm-Warden construct at the central weir",
        visualAction:
          "Rising from the central spillway is the Orchard Warden — an ancient stone-and-copper sluice automaton whose chest turbine is jammed open to maximize upper-tier power collection.",
        lightingAndColor:
          "Harsh white-gold lightning arcs reflecting off wet verdigris bronze and moss-covered basalt.",
        dialogueOrVoiceover:
          "EMILIA: 'Someone pinned its governor valve by hand. It isn't malfunctioning. It was ordered not to vent.'",
        soundAndMusicCue: "Metallic grinding of bronze turbine gears against rising water pressure.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 65mm cinematic shot of a weathered stone and verdigris-copper sluice automaton standing waist-deep in a roaring mountain spillway, an exposed bronze governor turbine in its chest sparking with golden electrostatic arcs, rain and mist.",
        negativePrompt:
          "modern sci-fi robot, transformers style, glowing red evil eyes, plastic armor",
      },
      {
        shotNumber: 4,
        durationSec: 19,
        cameraAndLens: "Interactive Choice Hold Frame — split Codex Graphic overlay",
        visualAction:
          "Emilia sets her brass synthesis prism on the weir parapet while Mera places both hands into the spillway current. Three structural paths illuminate in Codex Graphic gold-and-teal lines across the frame.",
        lightingAndColor:
          "Balanced triad of Atlantean Teal (#00bcd4, water weir), Arcanean Gold (#ffd700, grounding rods), and Aquamarine (#7fffd4, dual refraction).",
        dialogueOrVoiceover:
          "SYSTEM PROMPT: 'Twelve seconds before the lower cistern seam fails. Choose how the load is shared.'",
        soundAndMusicCue: "Heartbeat sub-bass pulse with suspended glass marimba chord.",
        imageGenerationPrompt:
          "Arcanean Prism Realism with subtle Codex Graphic gold geometric overlay, close shot of a brass optical prism resting on a wet stone spillway wall beside a woman's calloused hands submerged in rushing teal-lit water, three delicate gold trajectory lines branching across the stone.",
        negativePrompt:
          "video game health bar, arcade buttons, neon green text, cartoon UI",
      },
      {
        shotNumber: 5,
        durationSec: 19,
        cameraAndLens: "40mm sweeping crane shot as the ancient flood weir opens",
        visualAction:
          "Mera and Emilia execute the dual refraction: the copper roots discharge their excess lightning harmlessly through the prism lens into a wide aquamarine sheet of rain while the lower sluice gates swing open into the dry ancestral channel.",
        lightingAndColor:
          "Luminous aquamarine (#7fffd4) and warm gold (#ffd700) caustics rippling across wet canyon walls.",
        dialogueOrVoiceover:
          "MERA: 'There. Hear the pitch change? The river has room to breathe again.'",
        soundAndMusicCue: "Deep stone sluice gates rumble open; solo alto flute melody enters.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 40mm sweeping cinematic shot of ancient stone sluice gates opening in a mountain gorge, releasing a wide torrent of bioluminescent teal and gold-lit water into a dry riverbed below terraced glass-bark orchards, storm clouds parting.",
        negativePrompt:
          "CGI tsunami, modern concrete dam, oversaturated neon, blurry",
      },
      {
        shotNumber: 6,
        durationSec: 18,
        cameraAndLens: "85mm intimate close-up on Emilia's eye and the cooled glass orchard",
        visualAction:
          "As morning mist rises from the safe lower parish roofs, Emilia looks up from her brass lens—a faint, permanent silver-blue Iris Resonance Ring now circles her pupil, the honest cost of stepping down the storm.",
        lightingAndColor:
          "Soft dawn daylight with a delicate silver-teal ring around the iris.",
        dialogueOrVoiceover:
          "EMILIA: 'Keep the ledger page dry, Mera. When we get back to the Athenaeum, we're redrawing the watershed map.'",
        soundAndMusicCue: "Glass marimba and alto flute resolve on a quiet E-minor ninth chord.",
        imageGenerationPrompt:
          "Arcanean Prism Realism, 85mm intimate close-up portrait of a young woman artisan in rain-damp wool holding a brass optical lens, a subtle crystalline silver-blue resonance ring circling her dark iris, warm dawn mist rising from stone village roofs in the background.",
        negativePrompt:
          "cyborg eye, laser beam, heavy makeup, airbrushed skin, anime big eyes",
      },
    ],
    economics: {
      storyboardSliceCostUsd: 0.13,
      estimatedFullRenderCostUsd: 5.95,
      targetRuntimeEngine:
        "apps/web Living Lore Encounter Engine + AnimeLegends Remotion (philosophy-short)",
    },
    governance: {
      productionState: "planned-awaiting-human-render-gate",
      rightsVerificationState: "draft-requires-per-asset-sha256-on-render",
      approverRequired: "human:frank",
    },
  },
] as const;
