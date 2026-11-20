import assert from "node:assert/strict";
import test from "node:test";
import { requireStudyPreview } from "./gate";
import selection from "./selection.json";
import { resolveStudyWork, works } from "./works";

test("every selected revision resolves to a unique exhibition-approved artwork", () => {
  assert.equal(works.length, 20);
  assert.equal(new Set(works.map((w) => w.revision)).size, 20);
  assert.equal(new Set(works.map((w) => w.id)).size, 20);
  assert.equal(works.filter((w) => w.status === "Staging").length, 11);
  assert.equal(
    works.filter((w) => w.status === "Experimental proposal").length,
    9,
  );
});

test("unreviewed IDs and stale renditions are omitted from both collections", () => {
  const stale = "0".repeat(64);
  for (const id of ["b05", "fl02-pelora-hero", "unknown"]) {
    assert.equal(
      resolveStudyWork({ ...selection[0], id, revision: stale }, 1),
      undefined,
    );
  }
});

test("the studio sheet and Vessakar's visible continuity caveat stay attached", () => {
  assert.ok(
    works
      .find((w) => w.id === "fl02-seli-sheet")
      ?.dossier.endsWith("view=sheet"),
  );
  assert.ok(
    works
      .find((w) => w.id === "fl02-vessakar-hero")
      ?.notes.some((s) => /occlu/i.test(s)),
  );
});

test("only a Vercel preview or explicitly enabled local session serves the study", (context) => {
  const original = {
    vercel: process.env.VERCEL_ENV,
    local: process.env.ARCANEA_GENESIS_PREVIEW,
  };
  context.after(() => {
    if (original.vercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original.vercel;
    if (original.local === undefined)
      delete process.env.ARCANEA_GENESIS_PREVIEW;
    else process.env.ARCANEA_GENESIS_PREVIEW = original.local;
  });
  process.env.VERCEL_ENV = "production";
  process.env.ARCANEA_GENESIS_PREVIEW = "1";
  assert.throws(requireStudyPreview);
  process.env.VERCEL_ENV = "preview";
  assert.doesNotThrow(requireStudyPreview);
  delete process.env.VERCEL_ENV;
  assert.doesNotThrow(requireStudyPreview);
  delete process.env.ARCANEA_GENESIS_PREVIEW;
  assert.throws(requireStudyPreview);
});
