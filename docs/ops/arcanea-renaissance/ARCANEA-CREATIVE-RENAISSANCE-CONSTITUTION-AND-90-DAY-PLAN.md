# Arcanea Creative Renaissance — Executive Council Constitution & 90-Day Plan

> **Document ID:** `ARC-RENAISSANCE-2026-11-07`  
> **Version:** `v3.1.0-renaissance`  
> **Status:** `STAGING` (Executable modules in `apps/web/lib/renaissance/`; awaiting Creator lock via `/lock-decision`)  
> **Council Workstreams:** Mythology Architect · Celestial Art Director · Cultural Communications Director · Starlight Production Engineer  
> **Independent Examiner:** `verity-sloane` (`runIndependentCriticalReview()`, maker != checker, threshold `>= 85/100`)

---

## 1. Evidence & Reality Audit Summary (`[MEASURED]` / `[RULED]` / `[OPEN]`)

### 1.1 Existing Verified Assets vs. Unverified Proposals

| Domain | Verified Existing Assets (`[MEASURED]` / `[RULED]`) | Proposals, Gaps & Contradictions Challenged (`[OPEN]` / Quarantined) |
|---|---|---|
| **Canon & Narrative** | `1,821,000` manuscript words across 3 trees (`Chronicles of Arcanea`: `354,089` words / `83` files; Book 1 *The Three Academies* 20 chapters complete; 4 built EPUBs: `golden-age` `38,880w`, `fable` `41,419w`, `wordless-laws` `32,473w`, `arcanea-legends` `17,526w`) `[MEASURED, TRUTH.md §3]`. `.arcanea/lore/CANON_LOCKED.md` locks Lumina, Nero (fertile unknown, NOT evil), Five Elements, Ten Gates, Seven Wisdoms, and Malachar Lumenbright `[RULED]`. | Four unbridged cast centers across the repo; `book/series-bible.md` and `.arcanea/config/voice.yaml` still listed Gate 8 as `Shift` instead of `Starweave` (**remediated in this PR**); `crew-data.ts` called Vesper a `"Luminor intelligence entity"` violating `CANON_LOCKED.md` Tier 2 (**remediated in this PR**); `.arcanea/lore/PRISM_LUXIN_SYSTEM.md` imported Brent Weeks' *Lightbringer* vocabulary (`luxin`, `drafter`, `sub-red`, `paryl`) creating third-party IP contamination (**quarantined with `RM008` in this PR**). `The Book of Light` is `2,274` words (`6` chapters) — a short pamphlet, not a standalone flagship book `[MEASURED]`. |
| **Visual Collections & Art Direction** | `428` curated Arcanea images `[MEASURED, TRUTH.md §3]`; structured web exhibitions in `apps/web/lib/visual-encyclopedia/` (`firstlight-02` with fail-closed SHA-256 `publishedFirstlightAsset()`, `weight-of-wonders` with 6 river-linked boss/place pairs, `sovereign-depths` with 24 bosses & 12 dungeons, `forge` across 5 vessel domains); 100-job Living Constellation campaign schema in `apps/web/data/arcanea-visual-campaign.v1.json`. | Root `DESIGN.md` (`#05070f` / `#c5a26f` / retired `higgsfield-mcp`) conflicted with `packages/design-system/src/tokens.ts` (`#0b0e14` / `#00bcd4` / `#ffd700`) and `TASTE.md`; Notion Visual Production Command still listed banned fonts (`Space Grotesk`, `Inter`, `Newsreader`); `.arcanea/lore/GUARDIAN_VISUAL_CANON_AUDIT.md` rules that Guardian faces/gender/costumes are `pending` turnaround lock and prohibits a 10-Guardian council group render; `Sol` and `Source` Godbeasts are blocked by local lore contradictions; Google Drive `30 — Assets — Approved for Publication` is empty (`0` cleared files). |
| **Music & Audio** | `845` Suno tracks (`26,193` plays, `545` followers, `20` style-voices of which `4` are Arcanean; top track `"Open the Arc"` at `1,004` plays) `[MEASURED, TRUTH.md §3]`; in-world liturgical and work lyrics in `book/songs-and-hymns/THE_SONGS.md`. | `apps/web/app/music/music-content.tsx` leaked raw Solfeggio Hz strings (`174 Hz`–`1111 Hz`) in public track descriptions, violating `TASTE.md` Gate 2 and `.arcanea/config/voice.yaml` (**remediated in this PR**). Per-track commercial rights manifests (`@arcanea/rights-manifest`) remain `[OPEN]`. |
| **Production Infrastructure & Commerce** | `apps/web` live on `https://www.arcanea.ai` (`362` sitemap URLs); `starlight-creator-command` (`32/32` tests green, HMAC content-bound human approval, `$40/mo` Arcanea model budget, `~$0.13` per storyboard slice); `arcanea-studio` multi-model router; `AnimeLegends` Remotion v4 pipeline; `SHOP_EDITIONS` fail-closed checkout in `apps/web/lib/shop/`. | `starlight-creator-command` Cloudflare live deploy is blocked on B1–B9 (`CLOUDFLARE_API_TOKEN`, D1 ID, secrets); `AnimeLegends` `flagship-short.json` is `"status": "planning-only"`; all 4 `SHOP_EDITIONS` are in `preview` (`priceState: "proposed"`), and prior to this PR `/shop/[slug]` lacked a Gate G5 Founding Cohort waitlist form to capture buyer role and fair price band (**wired in this PR**). |

---

## 2. Workstream I — Mythology Architect: Flagship Narrative Bible & Dual-Cast Bridge

Executable source of truth: `apps/web/lib/renaissance/narrative-bible.ts`.

### 2.1 Four-Altitude Cast & Story Architecture
Rather than erasing existing manuscripts or collapsing distinct story scales into one muddy cast, Arcanea operates across four synchronized narrative altitudes sharing the same historical timeline:

1. **Altitude 1 — Confluence Public Center (Intimate Hero Path / Books 1–3 & Public Entry)**:
   - **Arion** (legacy alias *Kael Thornfield*): Gate-Touched nineteen-year-old stone-worker's son from Ironhold; Foundation/Earth channeler awakening into Five-Fold Confluence. Vow: *"My power will never be someone else's disaster again."*
   - **Mera Tidecrest**: House Aqualis Water-memory bender and emotional truth witness.
   - **Emilia**: House Synthesis Prism Weaver / Refractor who builds optical instruments that share load rather than consuming the practitioner.
   - **Headmaster Akamoto**: Bonded Dragon-Rider mentor who refuses Compact child-weaponization.
   - **Clerk Sera Venn**: Confluence Registration Hall Three civil clerk who refuses the military ordnance stamp.
   - **Malachar Lumenbright**: Locked Tier 4 tragic antagonist mirror sealed in Shadowfen — former First Eldrian Luminor whose compassion curdled into forced control.
2. **Altitude 2 — Field Franchise Center (*The Dawnsworn* / Starlight Corps Sector Four)**:
   - **Commander Kaelindra Voss** (Starweave strategist, 17-option lattice), **Ryn** (volatile Fire/Foundation catalyst), **Velindris** (House Synthesis archivist), **Solenne Ashmark** (Ember vanguard), **Taura Skein & Vaerith** (Bonded recon), **Auren Vorath** (Architect structural weaver — explicitly disambiguated from Void Ascendant Herald **Caelum Ironfaith**), and **Mireth** (Void-anchor), opposing the Five Void Ascendant Heralds.
3. **Altitude 3 — Interactive Companion & Ecological Encounters (*Living Lore*, *Weight of Wonders*, *Sovereign Depths*, *Firstlight II*)**:
   - **The Living Lore Crew**: *Ren*, *Vesper* (remediated to `The Awakened — Luminor-Rank Construct`), *Kaedra*, *Thalien*, *Axiom*, *Solenne*, *Jinx*.
   - **Weight of Wonders**: 6 river-linked boss and watershed pairs along the Orvess river system (*The Storm Orchard of Orvess*, etc.).
4. **Altitude 4 — Cosmological & Institutional Foundation (`CANON_LOCKED.md`)**:
   - *Lumina* (First Light / Form-Giver) & *Nero* (Primordial Darkness / Fertile Unknown — never evil); *Five Elements* (`Fire`, `Water`, `Earth`, `Wind`, `Void/Spirit`, with `Shadow` as corrupted Void without Spirit); *Ten Gates* (Gate 8 locked as `Starweave`); *Seven Wisdoms*; *Three Academies* (*The Luminary on Crystalpeak*, *The Draconic Forge*, *The Atlantean Athenaeum*).

### 2.2 IP Quarantine (`RM008`) & Ontology Boundary
- **Native Spectrum Weaving Lexicon**: All Brent Weeks *Lightbringer* comparative terms in `.arcanea/lore/PRISM_LUXIN_SYSTEM.md` are quarantined under `RM008_THIRD_PARTY_IP_CONTAMINATION_BLOCK`. Public canon uses **Refracted Destello / Spectrum Glass**, **Prism Weaver / Refractor**, **Iris Resonance Ring**, and **Hollow Glass**.
- **Starlight Ontology Boundary**: Real-world **Starlight Intelligence** is never used as an in-world mystical force; ten-Gate attainment is **Starweave Attunement**.

---

## 3. Workstream II — Celestial Art Director: Design Constitution `v3.1.0-renaissance`

Executable source of truth: `apps/web/lib/renaissance/constitution.ts`.

### 3.1 Four Surface & Visual Modes
1. **`product-ui` (AI-Lab Dark Chrome)**: `#0b0e14` void, `#121826` deep, `#1a2332` surface, `#232f42` elevated; `#00bcd4` Atlantean Teal primary, `#0d47a1` Cosmic Blue secondary, `#ffd700` Arcanean Gold canon accent, `#7fffd4` Aquamarine success. Typography: `Geist` (UI/display/body), `Instrument Serif` (short italic accent only), `Geist Mono` (code/hashes/SKUs). Banned fonts: `Cinzel`, `Space Grotesk`, `Inter`, `Arial`, `Roboto`, `Newsreader`, `Plus Jakarta Sans`. Phosphor duotone SVG icons or clean monograms only.
2. **`prism-realism` (Flagship World & Live-Action Cinema)**: 75% physical cinema / 25% anime silhouette & ocular lighting intelligence. Weathered basalt, coral-pink volcanic stone, salt-stained linen, Refracted Destello caustics.
3. **`cel-cinematic` (Contemporary Anime Production Mode)**: 65% sakuga graphic shadow blocks with deliberate 2s/3s keyframe holds / 35% painted mineral multi-plane depth. Original IP character sheets only.
4. **`codex-graphic` (In-World Archival & Cartographic Mode)**: High-contrast Arcanean Gold (`#ffd700`) and Atlantean Teal (`#00bcd4`) orthographic watershed and structural schematics over Cosmic Void (`#0b0e14`).

### 3.2 Guardian & Godbeast Staging Lock Discipline
- Per `.arcanea/lore/GUARDIAN_VISUAL_CANON_AUDIT.md`, Guardian humanoid faces, gender distribution, and garments remain `STAGING_TURNAROUND_REQUIRED`. Public product surfaces use Gate architectural monuments, grounded Godbeast studies (`Kaelith` = Ringback closed stone annulus wyrm; `Veloura` = Phoenix-Serpent; `Draconis` = wingless 6-limbed Solar Crucible; `Laeylinn` = Worldtree Stag; `Kyuro` = 2-headed 8-pillar Bridge-Beast), and named mortal faculty (*Headmaster Akamoto*, *Archon Celestine Halcyon*, *Warden Theron Ashcroft*). `Sol` and `Source` remain blocked pending local lore contradiction resolution.

---

## 4. Three Cinematic Pilot Packages

Executable source of truth: `apps/web/lib/renaissance/pilots.ts`.

| Pilot ID | Title & Mode | Runtime & Cast | Dramatic Core & Score Stem | Budget & Governance |
|---|---|---|---|---|
| `PILOT-001-NAME-STARTS-WAR` | **"The Name That Starts a War"** (`prism-realism`, 6 shots) | `90s` (`2.39:1` / `16:9` / `9:16`) · Arion, Mera Tidecrest, Clerk Sera Venn | At Confluence Registration Hall Three, Arion absorbs a floor tremor into his own forearm rather than shattering stone; Sera Venn stamps `CIVIC APPRENTICE` and locks away the red military ordnance stamp. Score: *Foundation Stone & Copper Bell* (66 BPM, D Minor, solo cello & copper waterphone). | `$0.13` storyboard slice / `$4.85` full render (`planned-awaiting-human-render-gate`) |
| `PILOT-002-DAWN-SECTOR-FOUR` | **"Dawn Over Sector Four"** (`cel-cinematic`, 6 shots) | `75s` (`9:16` / `16:9`) · Kaelindra Voss, Ryn, Velindris, Auren Vorath + Trinity (Mira → Kage → Akashi) | Sixteen of Kaelindra's seventeen tactical branches snap dark under Hollow Glass fire; she steps out of the command post and braids Ryn's volatile Fire surge by hand into the viaduct's stone ribs until 4,000 civilians clear the span. Score: *Open the Arc (Sector Four Reprise)* (128 BPM, F# Minor, hybrid taiko & Reese bass). | `$0.13` storyboard slice / `$5.40` full render (`planned-awaiting-human-render-gate`) |
| `PILOT-003-STORM-ORCHARD-ORVESS` | **"The Storm Orchard of Orvess"** (`codex-graphic` + `prism-realism`, 6 shots + 3 choices) | `110s` (`16:9` / `9:16`) · Mera Tidecrest, Emilia, Storm-Warden of Orvess | A century storm overcharges 600 lightning-harvesting glass trees above the Orvess gorge; Mera and Emilia execute a dual Flow-and-Sight refraction to open the pre-Compact flood weir, leaving Emilia with a permanent silver-blue Iris Resonance Ring. Score: *Rain on Singing Stairs* (84 BPM, E Minor, glass marimba & alto flute). | `$0.13` storyboard slice / `$5.95` full render (`planned-awaiting-human-render-gate`) |

---

## 5. Workstream III & IV — Multi-Platform Editorial System, Approval Pipeline & Revenue Experiment

Executable sources of truth: `apps/web/lib/renaissance/editorial-and-pipeline.ts`, `apps/web/lib/renaissance/revenue-experiment.ts`, and `apps/web/components/shop/checkout-action.tsx`.

1. **7-Stage Approval-Based Production Pipeline (`$0.13` slice budget, `$40/mo` Arcanea cap)**:
   - `1. capture` (`leona-fisk`) → `2. lore-canon-lock` (`theo-park`) → `3. visual-direction` (`elian-cross`) → `4. audio-pairing` (`sera-quinn`) → `5. independent-critic` (`verity-sloane`, maker != checker, `>= 85/100`) → `6. human-hmac-approval` (`human:frank`, 48h content-bound token) → `7. release-manifest` (`cassian-reed`, `@arcanea/rights-manifest` v0 receipt).
2. **Gate G5 Founding Cohort Revenue Experiment (`EXP-ARC-2026-Q4-G5`)**:
   - Honors `TRUTH.md` §2 (`[RULED]`: BYOK, zero multi-tenant SaaS, pre-launch surfaces are waitlists capturing buyer role + fair price band before checkout opens) and `DEMAND-CAPTURE-OFFERS.md` (`Give -> Prove -> Position -> Invite`).
   - Visitors on `/shop/[slug]` can immediately read the free sample scene (`/shop/sample`), select their craft role (`worldbuilder`, `author`, `gamedev`, `collector`, `studio`) and fair one-time price band (`€7`, `€29`, `€49`, `€99`, `€299`), and record their place on the Founding Cohort list (launch price lock + permanent named credit in `FOUNDERS.md`).

---

## 6. 90-Day Integrated Execution Plan (Days 1–90)

| Phase | Window | Key Deliverables & Verification Gates | Owner Seat |
|---|---|---|---|
| **Phase 1: Foundation, Hygiene & Demand Capture** | Days 1–30 | Merge Creative Renaissance Constitution (`v3.1.0`), Narrative Bible (`v1.0.0`), Hz/voice/IP remediations, and Shop Gate G5 Founding Cohort waitlist form. Publish free *World Seed* & *Registration Hall Three* proof chapter. Capture first `50` verified price-band signals. | `theo-park`, `sera-quinn`, `cassian-reed`, `human:frank` |
| **Phase 2: Pilot Production & Turnaround Locks** | Days 31–60 | Complete human turnaround sign-off for Altitude 1 & 2 lead character sheets and grounded Godbeasts (`Veloura`, `Laeylinn`, `Kaelith`, `Draconis`). Render Pilots 01–03 through `starlight-creator-command` + `AnimeLegends` Remotion + `arcanea-studio` within the `$40/mo` Arcanea model cap. Attach per-asset SHA-256 `@arcanea/rights-manifest` v0 files. | `elian-cross`, `verity-sloane`, `human:frank` |
| **Phase 3: First Edition Release & Co-Creation Loop** | Days 61–90 | Ratify Gate G5 pricing from revealed waitlist data; clear counsel review on edition license templates; open `living-cosmos-first-edition` and `worldbuilder-production-edition` one-time checkouts once `editionReleased()` and `isReleaseReady()` return `true`. Launch the first community *Watershed Encounter* co-creation challenge. | `leona-fisk`, `priya-sen`, `cassian-reed`, `human:frank` |
