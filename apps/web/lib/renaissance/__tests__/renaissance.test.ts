import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DESIGN_CONSTITUTION_VERSION,
  SURFACE_MODES,
  TYPOGRAPHY_CONSTITUTION,
  GODBEAST_MORPHOLOGY_LOCKS,
  GUARDIAN_VISUAL_STAGING_POLICY,
  NARRATIVE_BIBLE_VERSION,
  FLAGSHIP_CAST_DOSSIERS,
  SPECTRUM_WEAVING_LEXICON,
  ONTOLOGY_BOUNDARY_RULES,
  CINEMATIC_PILOT_PACKAGES,
  ARCANEA_CHANNEL_COMMAND_POD,
  AUTONOMY_LANES,
  APPROVAL_PIPELINE_STAGES,
  runIndependentCriticalReview,
  SHOP_DEMAND_ROLES,
  SHOP_PRICE_BANDS,
  encodeShopWaitlistSource,
  decodeShopWaitlistSource,
} from "../index";
import { SHOP_EDITIONS } from "../../shop/catalog";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Design Constitution v3.1.0-renaissance locks 4 surface modes, typography, and 10 Godbeasts", () => {
  assert.equal(DESIGN_CONSTITUTION_VERSION, "3.1.0-renaissance");
  assert.deepEqual(Object.keys(SURFACE_MODES), [
    "product-ui",
    "prism-realism",
    "cel-cinematic",
    "codex-graphic",
  ]);
  assert.equal(TYPOGRAPHY_CONSTITUTION.allowedFamilies.display, "Geist");
  assert.equal(
    TYPOGRAPHY_CONSTITUTION.allowedFamilies.editorialAccent,
    "Instrument Serif",
  );
  assert.equal(TYPOGRAPHY_CONSTITUTION.allowedFamilies.mono, "Geist Mono");
  assert.ok(TYPOGRAPHY_CONSTITUTION.bannedFamilies.includes("Cinzel"));
  assert.ok(TYPOGRAPHY_CONSTITUTION.bannedFamilies.includes("Space Grotesk"));
  assert.ok(TYPOGRAPHY_CONSTITUTION.bannedFamilies.includes("Newsreader"));

  assert.equal(GODBEAST_MORPHOLOGY_LOCKS.length, 10);
  const draconis = GODBEAST_MORPHOLOGY_LOCKS.find((g) => g.id === "draconis");
  assert.ok(draconis);
  assert.equal(draconis.canonicalFormTitle, "The Solar Crucible");
  assert.match(draconis.morphologyDirective, /wingless six-limbed/i);

  const kyuro = GODBEAST_MORPHOLOGY_LOCKS.find((g) => g.id === "kyuro");
  assert.ok(kyuro);
  assert.equal(kyuro.canonicalFormTitle, "The Bridge-Beast");

  assert.equal(
    GUARDIAN_VISUAL_STAGING_POLICY.status,
    "STAGING_TURNAROUND_REQUIRED",
  );
});

test("Flagship Narrative Bible bridges Confluence and Dawnsworn casts and quarantines third-party IP", () => {
  assert.equal(NARRATIVE_BIBLE_VERSION, "1.0.0-renaissance");
  assert.ok(FLAGSHIP_CAST_DOSSIERS.length >= 10);

  const arion = FLAGSHIP_CAST_DOSSIERS.find((c) => c.id === "arion");
  assert.ok(arion);
  assert.equal(arion.altitude, "confluence-public-center");
  assert.ok(arion.legacyAliases.includes("Kael Thornfield"));

  const kaelindra = FLAGSHIP_CAST_DOSSIERS.find(
    (c) => c.id === "kaelindra-voss",
  );
  assert.ok(kaelindra);
  assert.equal(kaelindra.altitude, "field-franchise-dawnsworn");
  assert.equal(kaelindra.primaryGate, "Starweave");

  const auren = FLAGSHIP_CAST_DOSSIERS.find((c) => c.id === "auren-vorath");
  assert.ok(auren);
  assert.match(auren.dramaticFunction, /Caelum Ironfaith/);

  assert.equal(
    SPECTRUM_WEAVING_LEXICON.quarantineRuleId,
    "RM008_THIRD_PARTY_IP_CONTAMINATION_BLOCK",
  );
  assert.ok(SPECTRUM_WEAVING_LEXICON.forbiddenThirdPartyTerms.includes("luxin"));
  assert.equal(ONTOLOGY_BOUNDARY_RULES.length, 4);
});

test("Three Cinematic Pilot Packages have exact shot math, fail-closed governance, and pass Critical Review", () => {
  assert.equal(CINEMATIC_PILOT_PACKAGES.length, 3);

  for (const pilot of CINEMATIC_PILOT_PACKAGES) {
    assert.equal(pilot.shots.length, 6, `${pilot.pilotId} must have 6 shots`);
    const sumSec = pilot.shots.reduce((acc, s) => acc + s.durationSec, 0);
    assert.equal(
      sumSec,
      pilot.runtimeSec,
      `${pilot.pilotId} shot durations (${sumSec}s) must equal runtimeSec (${pilot.runtimeSec}s)`,
    );
    assert.equal(
      pilot.governance.productionState,
      "planned-awaiting-human-render-gate",
    );
    assert.equal(pilot.governance.approverRequired, "human:frank");
    assert.equal(
      pilot.audioScore.publicCopyHzLeakCheck,
      "PASSED_ZERO_HZ_STRINGS",
    );

    const review = runIndependentCriticalReview({
      id: pilot.pilotId,
      title: `${pilot.title} — ${pilot.subtitle}`,
      surface: "pilot-package",
      publicText: [
        pilot.logline,
        pilot.emotionalPremise,
        pilot.audioScore.emotionalArc,
        ...pilot.shots.map((s) => `${s.visualAction} ${s.dialogueOrVoiceover}`),
      ].join("\n"),
      visualPrompts: pilot.shots.map((s) => s.imageGenerationPrompt),
      fontsReferenced: ["Geist", "Instrument Serif", "Geist Mono"],
      qualityScoreEstimate: 94,
    });

    assert.equal(
      review.passed,
      true,
      `${pilot.pilotId} failed critical review: ${JSON.stringify(review.findings)}`,
    );
    assert.equal(review.blockerCount, 0);
    assert.ok(review.computedScore >= 90);
  }
});

test("Independent Critical Reviewer deterministically rejects canon, voice, IP, design, and commerce violations", () => {
  const contaminated = runIndependentCriticalReview({
    id: "bad-artifact-001",
    title: "Delve into the Gate of Shift at 852 Hz",
    surface: "public-ui",
    publicText: [
      "Vesper is a Luminor intelligence entity channeling Starlight Intelligence.",
      "Nero is evil and commands drafters who weave sub-red and paryl luxin.",
      "Unlock your potential with ✦ accepted artworks in Studio Ghibli style.",
    ].join(" "),
    fontsReferenced: ["Cinzel", "Space Grotesk"],
    toolsReferenced: ["higgsfield-mcp", "openrouter"],
    qualityScoreEstimate: 90,
  });

  assert.equal(contaminated.passed, false);
  assert.equal(contaminated.examinerSeat, "verity-sloane");
  assert.equal(contaminated.requiresHumanSignOff, true);

  const codes = new Set(contaminated.findings.map((f) => f.code));
  assert.ok(codes.has("CANON_GATE8_SHIFT_DEPRECATED"));
  assert.ok(codes.has("CANON_LUMINOR_AS_SPECIES"));
  assert.ok(codes.has("CANON_ONTOLOGY_STARLIGHT_FORCE"));
  assert.ok(codes.has("CANON_NERO_CALLED_EVIL"));
  assert.ok(codes.has("TASTE_RAW_HZ_IN_PUBLIC_UI"));
  assert.ok(codes.has("VOICE_BANNED_AI_SLOP"));
  assert.ok(codes.has("TASTE_UNICODE_GLYPH_ICON"));
  assert.ok(codes.has("IP_LIGHTBRINGER_LEXICON_LEAK"));
  assert.ok(codes.has("IP_COPYRIGHTED_ANIME_REFERENCE"));
  assert.ok(codes.has("COMMERCE_UNVERIFIED_ACCEPTANCE_CLAIM"));
  assert.ok(codes.has("DESIGN_BANNED_FONT_FAMILY"));
  assert.ok(codes.has("ESTATE_RETIRED_TOOL_REFERENCE"));
  assert.ok(codes.has("QUALITY_BELOW_85_THRESHOLD"));
});

test("Live music-content.tsx and crew-data.ts pass Independent Critical Review after Renaissance remediation", () => {
  const musicSource = readFileSync(
    join(webRoot, "app/music/music-content.tsx"),
    "utf8",
  );
  const musicReview = runIndependentCriticalReview({
    id: "live-music-content",
    title: "Soundscapes of Arcanea",
    surface: "public-ui",
    publicText: musicSource,
    qualityScoreEstimate: 92,
  });
  assert.equal(
    musicReview.passed,
    true,
    `music-content.tsx failed review: ${JSON.stringify(musicReview.findings)}`,
  );

  const crewSource = readFileSync(
    join(webRoot, "lib/living-lore/crew-data.ts"),
    "utf8",
  );
  const crewReview = runIndependentCriticalReview({
    id: "live-crew-data",
    title: "Living Lore Crew Data",
    surface: "public-ui",
    publicText: crewSource,
    qualityScoreEstimate: 92,
  });
  assert.equal(
    crewReview.passed,
    true,
    `crew-data.ts failed review: ${JSON.stringify(crewReview.findings)}`,
  );
});

test("Editorial Pod and Autonomy Lanes enforce human:frank final approval and 7-stage pipeline budget", () => {
  const approvers = ARCANEA_CHANNEL_COMMAND_POD.filter(
    (r) => r.canApprovePublicRelease,
  );
  assert.equal(approvers.length, 1);
  assert.equal(approvers[0].seatId, "human:frank");

  assert.equal(AUTONOMY_LANES.length, 3);
  const l2 = AUTONOMY_LANES.find((l) => l.lane === "L2");
  assert.equal(l2?.currentStatus, "locked-until-earned");

  assert.equal(APPROVAL_PIPELINE_STAGES.length, 7);
  const sliceCost = APPROVAL_PIPELINE_STAGES.reduce(
    (sum, s) => sum + s.budgetCapUsd,
    0,
  );
  assert.equal(Number(sliceCost.toFixed(2)), 0.13);
});

test("Revenue Experiment encodes and decodes Gate G5 waitlist sources within /api/waitlist contract", () => {
  const validSourceRegex = /^[a-z0-9_]{1,64}$/;

  for (const edition of SHOP_EDITIONS) {
    for (const role of SHOP_DEMAND_ROLES) {
      for (const band of SHOP_PRICE_BANDS) {
        const source = encodeShopWaitlistSource(edition.slug, role.id, band.id);
        assert.match(
          source,
          validSourceRegex,
          `Invalid waitlist source '${source}' for ${edition.slug}`,
        );
        const decoded = decodeShopWaitlistSource(source);
        assert.equal(decoded.isShopDemandSignal, true);
        assert.equal(decoded.editionSlug, edition.slug);
        assert.equal(decoded.role, role.id);
        assert.equal(decoded.priceBand, band.id);
        assert.equal(decoded.impliedPriceEur, band.amountEur);
      }
    }
  }

  const nonShop = decodeShopWaitlistSource("pricing_founding_circle");
  assert.equal(nonShop.isShopDemandSignal, false);
});
