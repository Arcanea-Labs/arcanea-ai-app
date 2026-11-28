import assert from "node:assert/strict";
import {
  CANON_MAGIC_RANKS,
  CANON_SEVEN_WISDOMS,
  CANON_TEN_GATES,
  loadFirstDropLegends,
} from "../legends-loader";
import { ARTIST_CLIMATES, HOUSE_CODEX_PROMISE } from "../house-codex";

async function run() {
  const legends = await loadFirstDropLegends();
  assert.equal(legends.length, 3, "Expected Legends I, II, and III to load from disk.");

  const totalWords = legends.reduce((sum, legend) => sum + legend.wordCount, 0);
  assert.ok(totalWords > 4000, `Expected substantial canonical prose (>4000 words), got ${totalWords}.`);

  for (const legend of legends) {
    assert.ok(legend.sections.length >= 2, `${legend.fileName} should parse into multiple sections.`);
    assert.ok(legend.epigraph.length > 20, `${legend.fileName} should preserve its epigraph.`);
  }

  // Exact CANON_LOCKED.md invariants
  assert.equal(CANON_TEN_GATES.length, 10);
  const starweave = CANON_TEN_GATES.find((g) => g.gate === "Starweave");
  assert.equal(starweave?.guardian, "Elara");
  assert.equal(starweave?.godbeast, "Vaelith");
  assert.equal(starweave?.frequencyHz, 852);

  const sourceGate = CANON_TEN_GATES.find((g) => g.gate === "Source");
  assert.equal(sourceGate?.guardian, "Shinkami");
  assert.equal(sourceGate?.godbeast, "Source");
  assert.equal(sourceGate?.frequencyHz, 1111);

  assert.equal(CANON_SEVEN_WISDOMS.length, 7);
  assert.equal(CANON_MAGIC_RANKS[CANON_MAGIC_RANKS.length - 1]?.rank, "Luminor");

  // Guard against forbidden non-canon drift
  const serializedGates = JSON.stringify(CANON_TEN_GATES);
  assert.equal(serializedGates.includes("Amaterasu"), false, "Pre-2026-03-30 Godbeast name must not appear.");
  assert.equal(ARTIST_CLIMATES.length, 4);
  assert.ok(HOUSE_CODEX_PROMISE.rule.includes("Frank writes"));

  console.log(
    `premiere-canon tests passed: ${legends.length} legends (${totalWords} words), 10 locked gates, 7 wisdoms, 4 artist climates.`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
