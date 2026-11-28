# Arcanea Creative Renaissance — Executive Council Master Plan, Design Constitution, Narrative Bible & Pilot Specifications

> **Document ID:** `ARC-RENAISSANCE-2026-11-07`  
> **Version:** `v3.1.0-renaissance`  
> **Status:** `STAGING` — Implemented & verified in Draft PRs [Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728) and [Arcanea-Labs/AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76); awaiting Creator promotion via `/lock-decision`  
> **Council Workstreams:** Mythology Architect · Celestial Art Director · Cultural Communications Director · Starlight Production Engineer  
> **Independent Examiner:** `verity-sloane` (`runIndependentCriticalReview()`, maker != checker, pass threshold `>= 85/100`)

---

## 1. Evidence & Reality Audit (`[MEASURED]` / `[RULED]` / `[REPORTED]` / `[OPEN]`)

Every claim below is grounded in direct inspection of the connected repositories ([Arcanea-Labs/arcanea-ai-app](https://github.com/Arcanea-Labs/arcanea-ai-app), [Arcanea-Labs/AnimeLegends](https://github.com/Arcanea-Labs/AnimeLegends), [Arcanea-Labs/arcanea-studio](https://github.com/Arcanea-Labs/arcanea-studio), [frankxai/starlight-creator-command](https://github.com/frankxai/starlight-creator-command), [frankxai/starlight-estate](https://github.com/frankxai/starlight-estate)) and Notion governance records ([Arcanea 90-Day Execution Programme](https://app.notion.com/p/3fb26ac2b7f68138a81eff7cfd5012e7?pvs=204), [Arcanea Channel Command Record](https://app.notion.com/p/3c726ac2b7f6814683a6d5d005d65206?pvs=204), [Arcanea Visual World Bible V2](https://app.notion.com/p/3c226ac2b7f68166ad6fdeeca416139c?pvs=204), [Arcanea Visual Production Command](https://app.notion.com/p/3ca26ac2b7f6811cbd8dfe7bc59b1969?pvs=204), [Digital Product Portfolio Audit](https://app.notion.com/p/40926ac2b7f68174aac3e12c1be1f8ca?pvs=204)).

### 1.1 Existing Assets vs. Proposals & Contradictions Challenged

| Domain | Verified Existing Assets (`[MEASURED]` / `[RULED]`) | Weak Assumptions Challenged & Remediations Executed (`[OPEN]` / Fixed in Draft PRs) |
|---|---|---|
| **Mythology & Manuscript Corpus** | `1,821,000` manuscript words across 3 trees (`Chronicles of Arcanea`: `354,089` words across `83` markdown files; Book 1 *The Three Academies* 20 chapters complete; 4 built EPUBs: `golden-age` `38,880w`, `fable` `41,419w`, `wordless-laws` `32,473w`, `arcanea-legends` `17,526w`) `[MEASURED]` ([frankxai/starlight-estate](https://github.com/frankxai/starlight-estate)). `.arcanea/lore/CANON_LOCKED.md` locks Lumina, Nero (fertile unknown, NOT evil), Five Elements, Ten Gates, Seven Wisdoms, and Malachar Lumenbright `[RULED]` ([Arcanea-Labs/arcanea-ai-app](https://github.com/Arcanea-Labs/arcanea-ai-app)). | **1. Unbridged Four Cast Centers**: Reconciled via the Four-Altitude Narrative Bible (`apps/web/lib/renaissance/narrative-bible.ts`) without erasing manuscripts.<br>**2. Third-Party IP Contamination (`PRISM_LUXIN_SYSTEM.md`)**: Staging doc imported Brent Weeks' *Lightbringer* vocabulary (`luxin`, `drafter`, `sub-red`, `super-violet`, `paryl`, `halo-burn`). Quarantined with `RM008_THIRD_PARTY_IP_CONTAMINATION_BLOCK` and replaced by the **Canonical Native Arcanean Spectrum Lexicon** in [Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728).<br>**3. Gate 8 `Shift` vs `Starweave` & Vesper Species Drift**: Fixed stale `Shift` in `.arcanea/config/voice.yaml` and `book/series-bible.md`, and remediated Vesper from `"Luminor intelligence entity"` to `"The Awakened — Luminor-Rank Construct"` in `apps/web/lib/living-lore/crew-data.ts` ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)).<br>**4. Pamphlet Overclaim**: `The Book of Light` is `2,274` words (`6` chapters) `[MEASURED]` — classified honestly as an introductory primer, not a standalone commercial volume. |
| **Visual Collections & Art Direction** | `428` curated Arcanea visual assets `[MEASURED]` ([frankxai/starlight-estate](https://github.com/frankxai/starlight-estate)); structured exhibitions in `apps/web/lib/visual-encyclopedia/` (`firstlight-02` with fail-closed SHA-256 `publishedFirstlightAsset()`, `weight-of-wonders` with 6 river-linked boss/place pairs, `sovereign-depths` with 24 bosses & 12 dungeons, `forge` across 5 vessel domains); 100-job campaign manifest in `apps/web/data/arcanea-visual-campaign.v1.json` ([Arcanea-Labs/arcanea-ai-app](https://github.com/Arcanea-Labs/arcanea-ai-app)). | **1. Design Token & Font Drift**: Root `DESIGN.md` (`#05070f` / `#c5a26f` / retired `higgsfield-mcp`) and [Arcanea Visual Production Command](https://app.notion.com/p/3ca26ac2b7f6811cbd8dfe7bc59b1969?pvs=204) (`Space Grotesk`, `Inter`, `Newsreader`) conflicted with `TASTE.md` and `packages/design-system/src/tokens.ts`. Reconciled into 4 explicit Surface Modes in `apps/web/lib/renaissance/constitution.ts` (`v3.1.0-renaissance`).<br>**2. Unicode Glyph Ban Violation**: Replaced banned Unicode glyph avatars (`✦ ◈ ⚔ ᛟ ◆ ✧ ◑`) in `crew-data.ts` with clean typographic monograms (`RN, VS, KD, TH, AX, SL, JX`) ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)).<br>**3. Guardian/Godbeast Staging Discipline**: Enforced `.arcanea/lore/GUARDIAN_VISUAL_CANON_AUDIT.md` — humanoid Guardian faces/costumes require human turnaround lock (`STAGING_TURNAROUND_REQUIRED`), `Sol` and `Source` are blocked on local lore contradictions, and Google Drive `30 — Assets — Approved for Publication` currently holds `0` cleared files `[MEASURED]`. |
| **Music Catalog & Sonic Identity** | `845` Suno tracks (`26,193` plays, `545` followers, `20` style-voices of which `4` are Arcanean; flagship track `"Open the Arc"` at `1,004` plays) `[MEASURED]` ([frankxai/starlight-estate](https://github.com/frankxai/starlight-estate)); in-world liturgical and work lyrics in `book/songs-and-hymns/THE_SONGS.md` ([Arcanea-Labs/arcanea-ai-app](https://github.com/Arcanea-Labs/arcanea-ai-app)). | **Public `/music` Solfeggio Hz Leak**: `apps/web/app/music/music-content.tsx` exposed raw Solfeggio Hz integers (`174 Hz`–`1111 Hz`) in public track descriptions, violating `TASTE.md` Gate 2 and `.arcanea/config/voice.yaml`. Remediated in [Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728) and enforced by `evaluateRenaissanceGate()` in `packages/creative-pipeline/src/curator.ts`. Per-track commercial rights manifests (`@arcanea/rights-manifest` from [Arcanea-Labs/arcanea-ai-app#718](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/718)) remain `[OPEN]`. |
| **Production Pipeline & Commerce** | Live web app at [arcanea.ai](https://www.arcanea.ai) (`362` sitemap URLs); `starlight-creator-command` (`32/32` tests green, HMAC content-bound human approval, `$40/mo` Arcanea model cap, `~$0.13` per storyboard slice) ([frankxai/starlight-creator-command](https://github.com/frankxai/starlight-creator-command)); `arcanea-studio` multi-model router ([Arcanea-Labs/arcanea-studio](https://github.com/Arcanea-Labs/arcanea-studio)); `AnimeLegends` Remotion v4 pipeline ([Arcanea-Labs/AnimeLegends](https://github.com/Arcanea-Labs/AnimeLegends)); fail-closed shop checkout in `apps/web/lib/shop/` ([Arcanea-Labs/arcanea-ai-app#721](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/721)). | **1. Missing Shop Gate G5 Demand Capture**: All 4 `SHOP_EDITIONS` are in `preview` (`priceState: "proposed"`), and `/shop/[slug]` previously showed only a static notice with no way to capture buyer role or fair price band per `TRUTH.md` §2. Wired the Founding Cohort Demand-Capture waitlist form in `apps/web/components/shop/checkout-action.tsx` ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)).<br>**2. Unverified Deployment Honesty**: `starlight-creator-command` Cloudflare live deploy remains blocked on B1–B9 (`CLOUDFLARE_API_TOKEN`, D1 ID, secrets) `[MEASURED]`; Pilot Remotion manifests in [Arcanea-Labs/AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76) remain `release_state: "script"` until human render & sign-off. |

---

## 2. Workstream I — Mythology Architect: Flagship Narrative Bible (`v1.0.0-renaissance`)

Implemented in `apps/web/lib/renaissance/narrative-bible.ts` ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)).

### 2.1 Four-Altitude Cast & World Architecture
Rather than discarding existing manuscripts or flattening distinct story scales, Arcanea's canon is organized into four synchronized narrative altitudes set in the same world and historical era (*The Eighth Age — Era of the Unbound Registry*):

1. **Altitude 1 — Confluence Public Center (Intimate Hero Path / Books 1–3 & Public Entry)**:
   - **Setting**: *The Great Confluence* (where the Three Academies — *The Luminary on Crystalpeak*, *The Draconic Forge*, and *The Atlantean Athenaeum* — meet for the first time in 300 years on the neutral basalt terraces of the Orvess delta).
   - **Protagonist — Arion** (legacy alias *Kael Thornfield*): Nineteen-year-old stone-worker's son from the grey quarry town of Ironhold. Gate-Touched across all five elements, beginning with raw Foundation/Earth resonance that makes stone hum and crack when his pulse spikes. Core vow: *"My power will never be someone else's disaster again."*
   - **Deuteragonist — Mera Tidecrest**: House Aqualis Water-memory channeler from the tidal terraces of Nechtan; hears emotional residue stored in standing water and refuses institutional erasure.
   - **Tritagonist — Emilia**: House Synthesis Prism Weaver / Refractor who designs precision Spectrum Glass optical instruments that distribute load across a team rather than burning out a single practitioner.
   - **Mentor — Headmaster Akamoto**: Scarred Dragon-Rider of the Draconic Forge bonded to the elder bronze wyrm *Kagutsuchi*; resists the Compact's push to conscript first-year students into boundary ordnance.
   - **Institutional Fulcrum — Clerk Sera Venn**: Senior civil registrar at Confluence Registration Hall Three who quietly stamps Arion `CIVIC APPRENTICE — UNBOUND` instead of handing him to military ordnance.
   - **Primary Antagonist Mirror — Malachar Lumenbright** (`CANON_LOCKED.md` Tier 4): Former First Eldrian Luminor, once Lumina's champion, rejected by Shinkami when he attempted forced fusion at the Source Gate (`1111 Hz`), now sealed in the Shadowfen whispering through corrupted Hollow Glass: *"Why wait ten years to fail when you can fix the world tonight?"*

2. **Altitude 2 — Field Franchise Center (*The Dawnsworn* / Starlight Corps Sector Four)**:
   - **Setting**: *The Ashen March & Sector Four Viaduct*, 400 leagues north along the Shadowfen containment perimeter where the Compact's civil infrastructure meets active Void-fissure storms.
   - **Ensemble**:
     - **Commander Kaelindra Voss** (*Starweave* strategist who holds 17 simultaneous tactical branches in her mind and pays for each collapsed branch with physical nerve-frost).
     - **Ryn** (volatile Fire/Foundation breach specialist rescued from the outer slag-pits).
     - **Velindris** (House Synthesis field archivist who reads pre-Shattering stone inscriptions under fire).
     - **Solenne Ashmark** (Ember vanguard shield-bearer).
     - **Taura Skein & Vaerith** (Wind-scout and bonded cliff-drake).
     - **Auren Vorath** (Architect structural weaver — explicitly disambiguated from the Void Ascendant Herald **Caelum Ironfaith**).
     - **Mireth** (quiet Void-anchor who keeps the squad's lantern-line from corrupting into Shadow).
   - **Antagonists**: *The Five Void Ascendant Heralds* led by **Caelum Ironfaith**.

3. **Altitude 3 — Interactive Companion & Ecological Encounters (*Living Lore*, *Weight of Wonders*, *Sovereign Depths*, *Firstlight II*)**:
   - **The Living Lore Crew** (`apps/web/lib/living-lore/crew-data.ts`): *Ren* (`RN`), *Vesper* (`VS`, remediated to *The Awakened — Luminor-Rank Construct*), *Kaedra* (`KD`), *Thalien* (`TH`), *Axiom* (`AX`), *Solenne* (`SL`), and *Jinx* (`JX`).
   - **Weight of Wonders Ecology** (`apps/web/lib/visual-encyclopedia/weight-of-wonders.ts`): Six watershed-linked boss and sanctuary pairs along the Orvess river system, anchoring community co-creation and ecological encounters.

4. **Altitude 4 — Cosmological & Institutional Foundation (`CANON_LOCKED.md`)**:
   - **Cosmic Duality**: *Lumina* (First Light, Form-Giver, Creation) and *Nero* (Primordial Darkness, Fertile Unknown, Potential — explicitly **never evil**).
   - **Five Elements**: *Fire*, *Water*, *Earth*, *Wind*, and *Void/Spirit* (*Void* = Nero's aspect of potential; *Spirit* = Lumina's aspect of transcendence; *Shadow* = corrupted Void severed from Spirit).
   - **Ten Gates & Magic Ranks**: `1. Foundation (Lyssandria / Kaelith)` · `2. Flow (Leyla / Veloura)` · `3. Fire (Draconia / Draconis)` · `4. Heart (Maylinn / Laeylinn)` · `5. Voice (Alera / Otome)` · `6. Sight (Lyria / Yumiko)` · `7. Crown (Aiyami / Sol)` · `8. Starweave (Elara / Vaelith)` · `9. Unity (Ino / Kyuro)` · `10. Source (Shinkami / Source)`. Ranks: *Apprentice (0–2)* → *Mage (3–4)* → *Master (5–6)* → *Archmage (7–8)* → *Luminor (9–10)*.

### 2.2 Canonical Native Arcanean Spectrum Lexicon (`RM008` Quarantine)
To eliminate third-party IP overlap with Brent Weeks' *Lightbringer* series in `.arcanea/lore/PRISM_LUXIN_SYSTEM.md`, the Council enforces the following replacement table across all manuscripts, prompts, and code (`apps/web/lib/renaissance/narrative-bible.ts` and `packages/creative-pipeline/src/curator.ts`):

| Quarantined Comparative Term (`[BLOCKED]`) | Canonical Native Arcanean Term (`[RULED]`) | Physical & Dramatic Behavior in Arcanea |
|---|---|---|
| `luxin` | **Refracted Destello / Spectrum Glass** | Solidified or semi-fluid elemental light drawn through basalt-crystal lenses or bodily attunement; decays into salt-ash when over-stressed. |
| `drafter` | **Prism Weaver / Refractor** | A practitioner trained at House Synthesis or the Luminary to split and anchor Destello into load-bearing or optical forms. |
| `sub-red` | **Deep-Foundation Band (Infrared Ember)** | Heavy, heat-retaining structural band used for thermal mortar and quarry cutting. |
| `super-violet` | **Crown-Ultraviolet Band (Cold Starline)** | Razor-thin precision carrier wave used for long-range survey lines and surgical lattice locks. |
| `chi` / `paryl` | **Starweave-Filament Band / Unity-Trace Band** | High-altitude cross-Gate harmonics that reveal hidden stress fractures inside stone and living bone. |
| `halo-burn` / `breaking the halo` | **Iris Resonance Ring / Spectrum Saturation** | Permanent metallic-mineral rings deposited in the iris each time a practitioner absorbs an over-threshold surge to save a structure or life. |
| `black luxin` | **Hollow Glass (Shadow-Severed Slag)** | Corrupted Void condensed without Spirit; drinks surrounding warmth and leaves brittle obsidian-grey ash. |

---

## 3. Workstream II — Celestial Art Director: Design Constitution (`v3.1.0-renaissance`)

Implemented in `apps/web/lib/renaissance/constitution.ts` ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)).

### 3.1 Four Surface Modes (Reconciling UI Tokens & Editorial Canvas)

| Surface Mode | Primary Surfaces | Palette & Material Tokens | Typography & Iconography |
|---|---|---|---|
| **`product-ui`** *(AI-Lab Dark Chrome)* | `/`, `/chat`, `/studio`, `/worlds`, `/music`, `/shop` | Void `#0b0e14`, Deep `#121826`, Surface `#1a2332`, Elevated `#232f42`; Atlantean Teal `#00bcd4`, Cosmic Blue `#0d47a1`, Arcanean Gold `#ffd700`, Aquamarine `#7fffd4` | `Geist` (UI/display/body), `Instrument Serif` (short italic accent only), `Geist Mono` (code/hashes/SKUs). Phosphor duotone SVG icons or 2-letter monograms only. |
| **`prism-realism`** *(Flagship World & Live Cinema)* | Hero world plates, Pilot 001, Pilot 003 live scenes, Book covers | **75% physical cinema / 25% anime silhouette & ocular lighting intelligence**. Weathered basalt `#161920`, coral-pink volcanic stone `#c98a78`, oxidised bronze `#8c6d46`, Refracted Destello caustics | Spare title cards in tracked `Geist` uppercase + 3–6 word `Instrument Serif` italic epigraph. |
| **`cel-cinematic`** *(Contemporary Anime Production)* | Pilot 002 (*Dawn Over Sector Four*), Trinity shorts, sakuga combat studies | **65% sakuga graphic shadow blocks with 2s/3s keyframe holds / 35% painted mineral multi-plane depth**. Deep indigo shadow `#0f1523`, ember rim `#ff6b35`, Starweave cyan `#00e5ff` | Clean subtitle track in `Geist` medium with high-contrast dark pill backdrop. |
| **`codex-graphic`** *(In-World Archival & Cartographic)* | Pilot 003 framing folios, *Weight of Wonders* river maps, *Firstlight II* plates | Cosmic Void `#0b0e14` field, Arcanean Gold `#ffd700` survey lines (`1px`–`1.5px`), Atlantean Teal `#00bcd4` hydrological vectors, parchment-bone `#e6dec8` callouts | `Geist Mono` coordinates/elevation markers + `Instrument Serif` italic folio headers. |

### 3.2 Godbeast Morphology & Guardian Staging Locks
Per `.arcanea/lore/GUARDIAN_VISUAL_CANON_AUDIT.md`, Guardian humanoid portraits remain `STAGING_TURNAROUND_REQUIRED` (no 10-Guardian group council renders), while the 8 grounded Godbeasts are locked to non-generic anatomical blueprints (`apps/web/lib/renaissance/constitution.ts`):
- **Kaelith** (Gate 1 — Foundation): *Colossal Ringback Stone-Serpent* — closed annular mountain-wyrm of interlocking basalt and obsidian tectonic plates (never a generic winged dragon).
- **Veloura** (Gate 2 — Flow): *Silver-Plumed Phoenix-Serpent* — pelagic sea-serpent body with articulated hydrofoil feather-vanes that condense mist into singing rain.
- **Draconis** (Gate 3 — Fire): *Wingless Six-Limbed Solar Crucible Wyrm* — heavy low-slung basalt-armored salamander-drake with a visible molten heart-furnace behind basalt ribs (explicitly **wingless**).
- **Laeylinn** (Gate 4 — Heart): *Worldtree Crown Stag* — ancient cervine colossus whose antlers are living silver-bark boughs bearing bioluminescent moss and rain-pools.
- **Otome** (Gate 5 — Voice): *Resonance-Crested Songbird Leviathan* — high-altitude avian-cetacean with bronze-reed acoustic tail-feathers.
- **Yumiko** (Gate 6 — Sight): *Nine-Eyed Loom-Owl Serpent* — silent nocturnal raptor-serpent whose feathers refract starlight into geometric survey grids.
- **Vaelith** (Gate 8 — Starweave): *Astral Lattice Weaver* — eight-limbed crystalline arachnid-lynx that walks along tension lines between possibilities.
- **Kyuro** (Gate 9 — Unity): *Two-Headed Eight-Pillar Bridge-Beast* — twin-necked basalt-and-brass colossus whose spine forms a literal load-bearing viaduct across chasms.
- **Sol** (Gate 7) & **Source** (Gate 10): **BLOCKED** (`CANON_CONTRADICTION_BLOCK`) pending Creator resolution of local lore file discrepancies.

---

## 4. Three Cinematic Pilot Packages

Implemented in `apps/web/lib/renaissance/pilots.ts` ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)) with companion Remotion `EpisodePacketProps` manifests and `studio-kernel` tests in [Arcanea-Labs/AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76).

### Pilot 01 — *"The Name That Starts a War"* (`PILOT-001-NAME-STARTS-WAR`)
- **Surface Mode**: `prism-realism` · **Runtime**: `90s` (`6` shots: `14s + 15s + 16s + 18s + 15s + 12s`) · **Aspect Ratios**: `2.39:1` master, `16:9` web, `9:16` cutdown.
- **Cast**: Arion, Mera Tidecrest, Headmaster Akamoto, Clerk Sera Venn.
- **Dramatic Core**: On Registration Day at the Great Confluence, Arion's Foundation tremor threatens to crack the basalt floor of Registration Hall Three. Instead of venting the force outward or accepting the Compact's military ordnance brand, Arion grounds the shockwave into his own forearm and asks Clerk Sera Venn to leave his military classification line blank (*"Leave the line open. I haven't earned what goes there yet."*).
- **6-Shot Storyboard**:
  1. `P1-S01` (`0–14s`, `35mm anamorphic slow push`): Rain-slick basalt courtyard of the Great Confluence; three delegations converge under wet slate banners.
  2. `P1-S02` (`14–29s`, `50mm over-shoulder`): Clerk Sera Venn holds the brass stylus over the open ledger: *"What name shall the Registry keep, Arion of the Outer Reaches?"*
  3. `P1-S03` (`29–45s`, `65mm close profile`): Mera Tidecrest watches the water in the bronze ink-well ripple at Arion's pulse: *"If you write it down, you'll spend ten years trying to live inside the ink."*
  4. `P1-S04` (`45–63s`, `85mm macro -> eye-level`): Arion presses his palm flat against the trembling stone desk, absorbing the Foundation fracture into a thin amber Iris Resonance Ring: *"Leave the line open. I haven't earned what goes there yet."*
  5. `P1-S05` (`63–78s`, `40mm medium two-shot`): Headmaster Akamoto steps between the Compact provost and the desk: *"Unbound, then. The tide has a longer memory than the ledger."*
  6. `P1-S06` (`78–90s`, `24mm wide crane pull-back`): Arion and Mera walk out onto the rain-washed Orvess terrace as the three Academy towers light against the dusk.
- **Score Brief**: *"The Blank Ledger Line"* — `66 BPM`, `D Minor`, solo cello, prepared felt piano, copper waterphone, low basalt frame-drum (paired with `"Open the Arc"` motif).
- **Cost & Governance**: `$0.13` storyboard slice / `$4.85` full render; Remotion manifest at `remotion/render-props/arcanea-pilot-001-registration-refuse.props.json` (`release_state: "script"`).

### Pilot 02 — *"Dawn Over Sector Four"* (`PILOT-002-DAWN-SECTOR-FOUR`)
- **Surface Mode**: `cel-cinematic` · **Runtime**: `75s` (`6` shots: `11s + 12s + 13s + 14s + 14s + 11s`) · **Aspect Ratios**: `9:16` vertical short + `16:9` widescreen.
- **Cast**: Commander Kaelindra Voss, Ryn, Velindris, Auren Vorath (disambiguated from Herald Caelum Ironfaith).
- **Dramatic Core**: At the fourth hour after midnight on the Sector Four iron-and-basalt viaduct, Hollow Glass artillery fractures the central keystone while 4,000 quarry workers cross below. When 16 of Kaelindra's 17 Starweave tactical branches collapse, she steps onto the exposed girder and braids Ryn's volatile Fire surge with Auren Vorath's Spectrum Glass struts so the dawn light itself locks the bridge.
- **6-Shot Storyboard**:
  1. `P2-S01` (`0–11s`, `28mm low-angle tracking`): Wind-lashed Sector Four viaduct at 04:00; lantern-lines sway over the Shadowfen abyss.
  2. `P2-S02` (`11–23s`, `50mm sakuga snap-zoom`): Kaelindra's Starweave lattice shatters from 17 cyan threads down to 1: *"Three thousand feet of iron, and the only thing holding the bridge is a lie."*
  3. `P2-S03` (`23–36s`, `35mm handheld Dutch-tilt`): Ryn braces against the cracking keystone as Hollow Glass ash eats the mortar: *"If the glass goes hollow, cut the cable. Don't wait for me."*
  4. `P2-S04` (`36–50s`, `18mm ultra-wide sakuga arc`): Auren Vorath drives twin Refracted Destello anchors into the pier: *"Hold the line—let the dawn take the weight!"*
  5. `P2-S05` (`50–64s`, `40mm 3-frame hold -> 24fps burst`): First sunlight hits the viaduct; Spectrum Glass ribs flare Atlantean Teal and Gold, vitrifying the fracture into solid load-bearing crystal.
  6. `P2-S06` (`64–75s`, `85mm quiet medium`): Smoke clears over the intact bridge; Velindris checks Ryn's new amber iris ring: *"You're two rings closer to the threshold, Ryn. Walk it off."*
- **Score Brief**: *"Iron Bridge at First Light (Open the Arc Reprise)"* — `128 BPM`, `F# Minor`, hybrid taiko, distorted cello ostinato, brass swells, crisp silence drop at `00:49`.
- **Cost & Governance**: `$0.13` storyboard slice / `$5.40` full render; Remotion manifest at `remotion/render-props/arcanea-pilot-002-dawn-sector-four.props.json` (`release_state: "script"`).

### Pilot 03 — *"The Storm Orchard of Orvess"* (`PILOT-003-STORM-ORCHARD-ORVESS`)
- **Surface Mode**: `codex-graphic` + `prism-realism` hybrid · **Runtime**: `110s` (`6` shots: `16s + 18s + 20s + 19s + 21s + 16s`) · **Aspect Ratios**: `16:9` interactive lore episode + `9:16` reel.
- **Cast**: Mera Tidecrest, Vesper (*The Awakened — Luminor-Rank Construct*), Veloura (*Phoenix-Serpent of the Second Gate*).
- **Dramatic Core**: Framed as an opening and closing `codex-graphic` watershed folio narrated by Vesper, transitioning into `prism-realism` inside the basalt tide-orchard of Orvess where 600 lightning-harvesting glass trees have gone dangerously still before a century squall. Rather than forcing the weir with brute Foundation pressure, Mera and Vesper tune the tide-pools back to Veloura's pelagic rhythm so the orchard vents the storm without shattering.
- **6-Shot Storyboard**:
  1. `P3-S01` (`0–16s`, `Orthographic top-down codex zoom`): Gold-and-teal hydrological chart of the Orvess gorge animates into relief; Vesper VO: *"When the sea forgets its rhythm, it does not rage—it goes still."*
  2. `P3-S02` (`16–34s`, `32mm match-dissolve to prism-realism`): Six hundred vitrified glass trees stand over dead-calm tide pools under violet thunderheads.
  3. `P3-S03` (`34–54s`, `50mm slow pan across water`): Veloura's silver-plumed Phoenix-Serpent silhouette glides beneath the weir, feather-vanes locked by calcified salt-slag.
  4. `P3-S04` (`54–73s`, `65mm close on Mera's hands`): Mera kneels in the cold brine, striking a three-beat Atlantean pulse against the stone sluice: *"Don't command the water. Give it back the beat it lost."*
  5. `P3-S05` (`73–94s`, `24mm wide crane ascent`): Lightning strikes the central glass bough; the restored tidal harmonic channels the surge harmlessly down the singing stairs in ribbons of aquamarine light.
  6. `P3-S06` (`94–110s`, `Match-dissolve back to codex-graphic folio`): The Orvess watershed plate updates its status seal to `HARMONIC RESTORED`; Vesper VO: *"What flows returns. What calcifies breaks."*
- **Score Brief**: *"Glass Branches in the Tide"* — `84 BPM`, `E Minor`, glass marimba, bowed vibraphone, alto flute, sub-bass swell, Atlantic surf field recording.
- **Cost & Governance**: `$0.13` storyboard slice / `$5.95` full render; Remotion manifest at `remotion/render-props/arcanea-pilot-003-storm-orchard.props.json` (`release_state: "script"`).

---

## 5. Workstream III & IV — Multi-Platform Editorial System, Approval Pipeline & Gate G5 Revenue Experiment

Implemented in `apps/web/lib/renaissance/editorial-and-pipeline.ts`, `apps/web/lib/renaissance/revenue-experiment.ts`, and `apps/web/components/shop/checkout-action.tsx` ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)).

### 5.1 Multi-Platform Editorial System (`pod.arcanea.website`)
Grounded in [frankxai/starlight-estate](https://github.com/frankxai/starlight-estate) `OPERATING-CADENCE.md` and [Arcanea Channel Command Record](https://app.notion.com/p/3c726ac2b7f6814683a6d5d005d65206?pvs=204):
- **Pod Seats**:
  - `leona-fisk` (Pod Lead & Narrative Showrunner)
  - `theo-park` (Mythology Architect & Canon Steward)
  - `elian-cross` (Celestial Art Director)
  - `sera-quinn` (Sonic & Cultural Communications Director)
  - `priya-sen` (Community & Co-Creation Steward)
  - `cassian-reed` (Starlight Production & Commerce Engineer)
  - `verity-sloane` (Independent Critic — `maker != checker`, never authors assets she grades)
  - `human:frank` (Creator & Final Approver — sole authority for `/lock-decision`, HMAC release tokens, and Gate G5 price activation)
- **Autonomy Lanes**:
  - `L0 (Autonomous Local)`: Repo audits, unit tests, staging draft generation, deterministic critic scoring.
  - `L1 (Draft PR / Reviewable Staging)`: Branch commits, Draft PR creation, Remotion `.props.json` script packets, waitlist instrumentation.
  - `L2 (Human Approval Required)`: Modifying `.arcanea/lore/CANON_LOCKED.md`, executing paid GPU/video renders above slice budget, publishing social posts, or flipping `priceState` from `"proposed"` to `"approved"`.
- **Weekly Multi-Platform Rhythm (1 Hero Artifact → 4 Native Derivatives)**:
  - **Tuesday (Canon & Manuscript Drop)**: 1 flagship scene or *Weight of Wonders* watershed dossier on `arcanea.ai/lore` + Substack essay (`Give -> Prove`).
  - **Thursday (Visual & Sonic Breakdown)**: 1 `prism-realism` or `codex-graphic` plate with Suno stem preview on `arcanea.ai/music` + X/LinkedIn craft thread + Instagram/TikTok `9:16` animatic reel.
  - **Saturday (Community Co-Creation & Founding Cohort Pulse)**: 1 bounded *Watershed Encounter* prompt inviting community submissions (scored by `evaluateRenaissanceGate()`) + Founding Cohort waitlist update.

### 5.2 Seven-Stage Approval Pipeline & Independent Critic Gate
1. `stage-1-capture` (`leona-fisk`): Story seed & scene intent locked against Narrative Bible.
2. `stage-2-canon-lock` (`theo-park`): Checked against `CANON_LOCKED.md`, `RM008` IP quarantine, and Ontology Boundary rules.
3. `stage-3-visual-direction` (`elian-cross`): Surface mode (`product-ui`, `prism-realism`, `cel-cinematic`, `codex-graphic`) and Godbeast/Guardian staging rules verified.
4. `stage-4-audio-pairing` (`sera-quinn`): Suno style-voice stem paired; zero raw Solfeggio Hz strings in public copy.
5. `stage-5-independent-critic` (`verity-sloane`): Automated `runIndependentCriticalReview()` + `evaluateRenaissanceGate()` (`minQuality: 85`, `minAlignment: 85`, `requireGuardianFit: true`, `autoApproveThreshold: 101`).
6. `stage-6-human-hmac-approval` (`human:frank`): Content-bound 48-hour HMAC token via `starlight-creator-command` (`~$0.13` per storyboard slice within the `$40/mo` Arcanea model budget).
7. `stage-7-release-manifest` (`cassian-reed`): Emits `@arcanea/rights-manifest` v0 SHA-256 receipt (`RM001`–`RM008`) before any public asset or edition goes live.

### 5.3 Gate G5 Founding Cohort Revenue Experiment (`EXP-ARC-2026-Q4-G5`)
- **Hypothesis**: Before activating live Stripe checkout on the 4 preview shop editions (`living-cosmos-first-edition` proposed `€49`, `worldbuilder-production-edition` proposed `€99`, `creator-launch-kit` proposed `€29`, `genesis-collector-vault` proposed `€299`), capturing structured **craft role** (`worldbuilder`, `author`, `gamedev`, `collector`, `studio`) and **revealed fair one-time price band** (`€7`, `€29`, `€49`, `€99`, `€299`) directly on `/shop/[slug]` after visitors read the free sample chapter (`/shop/sample`) will validate willingness-to-pay while preserving `TRUTH.md` §2 fail-closed discipline.
- **Implementation**: Wired in `apps/web/components/shop/checkout-action.tsx` and `apps/web/lib/renaissance/revenue-experiment.ts` ([Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)), encoding structured demand signals (`shop:<slug>|role:<role>|band:<priceBand>`) into the existing `/api/waitlist` endpoint without touching protected database migrations or payment secrets.
- **Decision Gate (Day 45 / Gate G5)**: When `>= 50` verified Founding Cohort signups are recorded with `>= 60%` selecting `€49+` for *Living Cosmos* or `€99+` for *Worldbuilder*, `human:frank` ratifies final one-time edition pricing and flips `priceState: "approved"` after legal counsel clears the edition license templates.

---

## 6. Integrated 90-Day Creative & Commercial Plan, Blockers & Next Decisions

| Window | Milestones & Verification Criteria | Primary Owners | Budget & Cost Envelope |
|---|---|---|---|
| **Days 1–30: Foundation, Canon Hygiene & Demand Capture** | 1. Review & merge [Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728) and [Arcanea-Labs/AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76).<br>2. Unblock `starlight-creator-command` Cloudflare Worker deploy (Blockers B1–B9: `CLOUDFLARE_API_TOKEN`, D1 database ID, webhook secrets).<br>3. Publish Pilot 01 manuscript chapter (*Registration Hall Three*) on `/shop/sample` and collect first `50` structured Gate G5 waitlist signals. | `theo-park`, `sera-quinn`, `cassian-reed`, `human:frank` | `$0` incremental SaaS; `~$3.90` for 30 storyboard slices (`$0.13/slice` within `$40/mo` Arcanea cap) |
| **Days 31–60: Turnaround Locks & Pilot Animatic Production** | 1. Human visual turnaround lock (`human:frank`) for Altitude 1 & 2 mortal leads (*Arion*, *Mera*, *Emilia*, *Akamoto*, *Kaelindra*, *Ryn*) and 4 grounded Godbeasts (*Kaelith*, *Veloura*, *Draconis*, *Laeylinn*), populating Google Drive `30 — Assets — Approved for Publication`.<br>2. Execute full renders for `PILOT-001`, `PILOT-002`, and `PILOT-003` (`$16.20` combined compute) and attach `@arcanea/rights-manifest` v0 files. | `elian-cross`, `verity-sloane`, `cassian-reed`, `human:frank` | `$16.20` total pilot render compute (`$4.85 + $5.40 + $5.95`) within `$40/mo` Arcanea budget |
| **Days 61–90: Gate G5 Ratification, First Edition Release & Co-Creation** | 1. Evaluate `EXP-ARC-2026-Q4-G5` demand distribution by craft role and price band.<br>2. Clear legal counsel sign-off on `living-cosmos-first-edition` and `worldbuilder-production-edition` license templates.<br>3. Flip approved editions to `priceState: "approved"` and launch the first community *Watershed Encounter* co-creation sprint. | `leona-fisk`, `priya-sen`, `cassian-reed`, `human:frank` | One-time digital edition revenue experiment (`€29`–`€299` bands); `$0` recurring platform liability |

### Immediate Next Decisions for `human:frank`
1. **Merge Draft PRs**: Review and merge [Arcanea-Labs/arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728) (`301` automated tests green across `apps/web` and `packages/creative-pipeline`) and [Arcanea-Labs/AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76) (`14/14` studio-kernel tests green).
2. **Promote Staging Resolutions (`/lock-decision`)**: Decide whether to lock the *Refracted Destello / Spectrum Glass* native lexicon (`RM008` replacement) and the Gate 7 (`Sol`) / Gate 10 (`Source`) Godbeast morphology resolutions into `.arcanea/lore/CANON_LOCKED.md`.
3. **Approve Pilot 01 Render Slice (`$4.85`)**: Issue the first 48-hour HMAC approval token in `starlight-creator-command` to render the 6 production plates and voice stems for `PILOT-001-NAME-STARTS-WAR`.

---

## 10. Verbatim Literary Scene Scripts & Director's Shot Ledgers (All 18 Shots)

### 10.1 Pilot 01 — *The Name That Starts a War* (`PILOT-001-NAME-STARTS-WAR` · `90s` · `prism-realism`)

- **Setting**: Great Confluence Registration Hall Three (`Altitude 1 — Public Center`)
- **Acoustic Pairing**: Foundation (`Lyssandria`) + Flow (`Leyla`) — `D Minor · 66 BPM` (bowed contrabass, prepared stone marimba, low cello harmonic pedal, rain on slate)
- **Mandatory Silence Beat**: Shot `P1-S04` drops all score for `2.4s` before Arion speaks (`[RULED]`)
- **Validated Studio-Kernel Fixture**: `packages/studio-kernel/fixtures/arcanea-pilot-001-registration-refuse.json` in [Arcanea-Labs/AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76) (`[MEASURED]`)

| Shot | Dur | Camera & Lens | Visual Composition & Materiality | Dialogue / Voiceover (Verbatim) | Dramatic Subtext & Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `P1-S01` | `14s` | `35mm anamorphic` slow dolly-in | Rain-slick basalt courtyard of the Great Confluence; Lumina ivory banners, Draconian obsidian standards, and Abyssal tide-glass lanterns converge above wet steps. | **CONFLUENCE NARRATION**: "Three schools. Ten thousand names in the brass ledger. Not one line for what a student refuses to break." | Institutional permanence vs. human fragility before a word is spoken. |
| `P1-S02` | `15s` | `50mm close-medium` low angle | Clerk Sera Venn holds a weighted brass stylus over the open vellum ledger; Compact Provost Vance watches from the upper gallery. | **CLERK SERA VENN**: "Line four is mandatory, Arion of the Outer Reaches. State your Siege or Ordnance classification for the Compact." | The Academy treats every gift as future artillery. |
| `P1-S03` | `16s` | `85mm macro` rack to Mera's eyes | Concentric standing ripples form inside the bronze ink-well on the clerk's desk before the hall instruments detect the sub-floor Foundation fault. | **MERA TIDECREST**: "Arion—the pier stone under the dais is shearing. Don't take the weight into your wrist." | Mera reads water and pressure before institutional sensors register danger. |
| `P1-S04` | `18s` | `40mm locked profile` (zero shake) | Arion presses his bare right palm flat against the splitting basalt desk, drawing the shear-wave into his radius bone; an amber `Iris Resonance Ring` flares around his pupil and mineral frost traces his wrist. `2.4s` total silence. | **ARION**: "Write: Mason's Apprentice, Orvess Weir. And leave the weapon line blank." | Power defined by the physical cost absorbed, never the spectacle inflicted. |
| `P1-S05` | `15s` | `65mm medium two-shot` | Headmaster Akamoto rests two fingers on the brass rail between Provost Vance and Arion's frost-stiffened hand. | **HEADMASTER AKAMOTO**: "Unbound, then. Let the ledger record an empty cell, Provost. The tide has a longer memory than our ink." | Akamoto recognizes an old Foundation discipline he thought died at the First Siege. |
| `P1-S06` | `12s` | `24mm wide crane pull-back` | Arion and Mera step out onto the rain-washed Orvess terrace as the three Academy towers ignite against the deep indigo dusk. | **MERA**: "You just made an enemy of three ministries before breakfast." **ARION**: "Then we had better learn how the river holds." | Promise of the flagship arc: friendship and civic craft against institutional extraction. |

---

### 10.2 Pilot 02 — *Dawn Over Sector Four* (`PILOT-002-DAWN-SECTOR-FOUR` · `75s` · `cel-cinematic`)

- **Setting**: Sector Four North Viaduct (`Altitude 2 — Dawnsworn Field Operations`)
- **Acoustic Pairing**: Fire (`Draconis`) + Starweave (`Elara`) — `F# Minor · 128 BPM` (taiko rim-clicks, analog sub-bass pulse, bowed steel cable harmonics, solo shakuhachi)
- **Mandatory Silence Beat**: Shot `P2-S04` cuts all percussion at the instant Kira crosses the 17th Starweave thread (`[RULED]`)

| Shot | Dur | Camera & Lens | Visual Composition & Materiality | Dialogue / Voiceover (Verbatim) | Dramatic Subtext & Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `P2-S01` | `12s` | `28mm extreme low-angle` | High-contrast cel-shaded silhouette of Commander Korath and Kira perched on the wet basalt arch above the Sector Four rail gorge; 17 cyan Starweave threads hum in the mist. | **KIRA**: "Convoy Six is running without ballast lamps. That isn't ore in the third cradle—it's unsealed Void-Glass." | Elite tactical competence grounded in working-district protection. |
| `P2-S02` | `12s` | `70mm whip-pan` | The overloaded third cradle shears the eastern suspension hawser; white-hot sparks cascade toward market roofs eighty meters below. | **COMMANDER KORATH**: "Kira—if that cradle hits the cistern roof, the lower ward drinks glass. Twelve seconds. Take the high line." | Immediate physical stakes: time, gravity, and civilian water supply. |
| `P2-S03` | `13s` | `35mm parallel tracking` | Korath drives both gauntlets into the granite pier, casting a braced lattice of `Refracted Destello` (`Spectrum Glass`) to catch the whipping hawser. | **COMMANDER KORATH**: "Anchor set! I can hold the shear for eight heartbeats—thread the pin now!" | Native Spectrum Weaving (`RM008`) shown as structural engineering under fire. |
| `P2-S04` | `14s` | `100mm macro` -> snap-zoom | Kira leaps across the open gorge reading 17 cyan trajectory threads; her left eye bleeds a violet-silver `Iris Resonance Ring` as she locks the iron clevis pin home. Percussion cuts out. | **KIRA**: "Thread seventeen... locked. Drop the brake, Commander." | `Starweave Attunement` carries immediate ocular capillary strain and vertigo. |
| `P2-S05` | `12s` | `24mm low wide` | The `Spectrum Glass` brace shatters into harmless luminous dust as the steel hawser takes the load three meters above the waking baker's stall. | **FIELD LOG**: "Cradle stabilized. Zero casualties in Lower Ward Four. Seal stamp belongs to the Ministry of Surplus." | The rescue uncovers an institutional smuggling chain. |
| `P2-S06` | `12s` | `50mm medium two-shot` | Kira wipes silver condensation from her temple while Korath pries the brass Ministry manifest plate off the crate. | **KIRA**: "They routed this through the Academy Confluence registry, Korath." **KORATH**: "Then we bring the crate to Hall Three ourselves." | Direct narrative bridge linking Altitude 2 (`Dawnsworn`) to Altitude 1 (`Confluence`). |

---

### 10.3 Pilot 03 — *The Storm Orchard of Orvess* (`PILOT-003-STORM-ORCHARD-ORVESS` · `110s` · `codex-graphic` + `prism-realism`)

- **Setting**: Highland Terraces of the Orvess Gorge (`Altitude 3 — Living Lore & Watershed Ecology`)
- **Acoustic Pairing**: Voice (`Alera`) + Flow/Fire Synthesis (`Veloura`) — `E Minor · 84 BPM` (glass harmonica, bowed cymbal, parchment rustle, monsoon thunder, solo alto voice)
- **Mandatory Silence Beat**: Shot `P3-S05` holds `2.0s` of pure orchard wind before the sub-harmonic wing-pass (`[RULED]`)

| Shot | Dur | Camera & Lens | Visual Composition & Materiality | Dialogue / Voiceover (Verbatim) | Dramatic Subtext & Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `P3-S01` | `18s` | `Orthographic rostrum zoom` | Hairline Arcanean Gold (`#ffd700`) and Atlantean Teal (`#00bcd4`) hydrological chart of the Orvess gorge over cosmic slate (`#0b0e14`); contours rise into 3D terrain. | **ARCHIVIST VESPER**: "Every empire remembers its swords. Almost none record how its orchards drank the lightning so the wheat could grow." | Establishes Arcanea's signature civic-ecology worldbuilding. |
| `P3-S02` | `19s` | `45mm lateral glide` | Six hundred hand-pruned fulgurite glass-trees stand on terraced basalt steps above the Orvess rapids, hollow boughs threaded with copper-and-kelp capillaries. | **ARCHIVIST VESPER**: "Six hundred fulgurite trunks, grafted by Foundation masons and Flow botanists over four generations. Not a weapon among them." | Magic as intergenerational public infrastructure rather than ego. |
| `P3-S03` | `18s` | `24mm locked wide` | A forked monsoon bolt strikes the orchard crown; the `Refracted Destello` canopy distributes the current down spiral root-channels into subterranean brine cisterns. | **ARCHIVIST VESPER**: "One strike boils forty thousand liters of bitter well-brine into sweet condensation for the lower terraces." | Concrete thermodynamics and ecological consequence. |
| `P3-S04` | `19s` | `85mm intimate portrait` | Elder Pruner Tovan presses a brass tuning fork to Trunk 44; his fingertips carry pale silver Lichtenberg scars from thirty seasons of grounding stray charge. | **ELDER PRUNER TOVAN**: "Listen to the third rib, Chronicler. It's ringing two semitones sharp. Something under the Confluence is pulling the water table down." | Connects the ecological anomaly directly to Pilot 01's Foundation shear. |
| `P3-S05` | `18s` | `35mm tilt up` | Through a break in the monsoon anvil cloud, the twin-plumed silhouette of `Veloura` (`Phoenix-Serpent`) banks silently across the stratosphere. `2.0s` pure wind. | **ARCHIVIST VESPER**: "When Veloura circles the low weirs before solstice, the Godbeasts are not hunting. They are taking inventory." | Godbeasts portrayed with mythic restraint and environmental scale. |
| `P3-S06` | `18s` | `Orthographic pullback` | Returns to the living Codex map; three unmapped tributary valleys along the Orvess river pulse with open brass survey pins. | **ARCHIVIST VESPER**: "Three tributaries remain unmeasured in Folio Nine. Bring us your hydrological notes, your weir songs, and the names of the masons who built them." | Direct entry into the *Orvess Watershed* Community Co-Creation Protocol. |

---

## 11. Week-by-Week 90-Day Execution Matrix (Weeks 1–13) & Shipped Receipts

| Week | Phase | Workstream | Concrete Deliverable & Acceptance Proof | Owner | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `W01` | Phase 1 · Canon & Hygiene | Mythology | Lock Four-Altitude Narrative Bible; remediate Gate 8 `Shift` -> `Starweave` & Vesper species drift | `theo-park` | **SHIPPED** ([arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)) `[MEASURED]` |
| `W02` | Phase 1 · Canon & Hygiene | Mythology | Enforce `RM008` Native Spectrum Weaving Lexicon across `.arcanea/lore/PRISM_LUXIN_SYSTEM.md` & curator gate | `ren-sato` | **SHIPPED** ([arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)) `[MEASURED]` |
| `W03` | Phase 1 · Canon & Hygiene | Art Direction | Ratify Design Constitution `v3.1.0-renaissance` & 4 Surface Modes; remove public Solfeggio Hz strings from `/music` | `elian-cross` | **SHIPPED** ([arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)) `[MEASURED]` |
| `W04` | Phase 1 · Canon & Hygiene | Engineering | Ship `verity-sloane` 6-gate evaluator, `/renaissance` Next.js route, and `studio-pilot.v1` SHA-256 fixtures (`39/39` tests green) | `kael-dorn` | **SHIPPED** ([arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728) & [AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76)) `[MEASURED]` |
| `W05` | Phase 2 · Pilot Slices | Art Direction | Render 6 locked orthographic turnarounds for Pilot 01 (`Arion`, `Mera`, `Akamoto`, `Hall Three`) at `$0.13/slice` | `elian-cross` | **READY FOR SLICE RENDER** (`$0.78` budget) `[RULED]` |
| `W06` | Phase 2 · Pilot Slices | Engineering | Compile Pilot 01 (`90s`) Remotion animatic + `D Minor` cello stem & pass `verity-sloane` gate (`>=85/100`) | `leona-fisk` | **MANIFEST PINNED** ([AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76)) `[MEASURED]` |
| `W07` | Phase 2 · Pilot Slices | Art Direction | Compile Pilot 02 (`75s`) `cel-cinematic` animatic + `128 BPM` taiko stem & pass `verity-sloane` gate | `leona-fisk` | **MANIFEST PINNED** ([AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76)) `[MEASURED]` |
| `W08` | Phase 2 · Pilot Slices | Mythology | Compile Pilot 03 (`110s`) `codex-graphic` documentary + Folio IX hydrological chart | `sola-vance` | **MANIFEST PINNED** ([AnimeLegends#76](https://github.com/Arcanea-Labs/AnimeLegends/pull/76)) `[MEASURED]` |
| `W09` | Phase 3 · Editorial & Cohort | Communications | Launch `1 Canonical Scene -> 5 Platform Derivatives` weekly cadence anchored on `arcanea.ai/renaissance` | `juno-vale` | **ROUTE LIVE IN PR** ([arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)) `[MEASURED]` |
| `W10` | Phase 3 · Editorial & Cohort | Communications | Open *Orvess Watershed Tributary Field-Note* community co-creation submissions | `juno-vale` | **CHARTER SPECIFIED** `[RULED]` |
| `W11` | Phase 3 · Editorial & Cohort | Engineering | Run Gate G5 Founding Cohort demand-capture experiment via `/api/waitlist` (`shop:<slug>|role:<role>|band:<band>`) | `kael-dorn` | **WAITLIST LIVE IN PR** ([arcanea-ai-app#728](https://github.com/Arcanea-Labs/arcanea-ai-app/pull/728)) `[MEASURED]` |
| `W12` | Phase 3 · Editorial & Cohort | Art Direction | Creator `/lock-decision` resolving `Sol` (Gate 7) and `Source / Amaterasu` (Gate 10) naming drift | `frankxai` | **AWAITING CREATOR LOCK** `[OPEN]` |
| `W13` | Phase 3 · Editorial & Cohort | Engineering | Executive Council Gate G5 Review: verify `>=40` qualified cohort opt-ins before unlocking any live Stripe checkout | `ren-sato` | **FAIL-CLOSED GATE** `[OPEN]` |

---

## 12. The *Orvess Watershed* Community Co-Creation Protocol & Creator Sovereignty Charter

1. **Participatory Scope (`Altitude 3 — Tributary Field Notes`)** `[RULED]`:
   - Community writers, concept artists, cartographers, and sound producers are invited to map the **three unmeasured tributary valleys of the Orvess Gorge** introduced in `PILOT-003-STORM-ORCHARD-ORVESS` (*Folio Nine*).
   - Submissions take three structured formats:
     - **Hydrological & Craft Field Notes** (`400–900 words`): A local weir, bridge, kiln, or botanical graft, naming the masons who built it and the physiological cost required to maintain it.
     - **Orthographic Blueprint Plates** (`codex-graphic` SVG/PNG): Architectural elevations or tool schematics adhering to the `#0b0e14` slate, `#00bcd4` teal, and `#ffd700` gold hairline standard.
     - **Weir & Work-Song Stems** (`16–32 bar WAV/FLAC loop`): Acoustic or hybrid stems paired to one of the Ten Gates without raw Solfeggio Hz marketing labels.
2. **Quality & Canon Gate (`verity-sloane` + Canon Warden)** `[RULED]`:
   - Every community submission runs through `runIndependentCriticalReview()` (`>=85/100`) to guarantee zero `RM008` third-party IP leakage, zero `CANON_LOCKED.md` contradictions, and concrete material grounding.
3. **Creator Sovereignty & Attribution (`Non-Predatory by Default`)** `[RULED]`:
   - Submitting creators retain full moral attribution (`Codex Folio Credit + Creator Handle + SHA-256 Content Pin`) and non-exclusive portfolio rights to their contributed field notes, blueprints, and stems.
   - If a community contribution is selected for a future commercial print/digital anthology after Gate G5 passes, inclusion requires an explicit countersigned revenue-share rider—never silent lock-in.
