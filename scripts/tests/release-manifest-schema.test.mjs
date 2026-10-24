import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { validateReleaseManifest } from "../validate-release-manifest.mjs";

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/release-manifest",
);

test("Valid release manifest passes and returns receipt", () => {
  const validData = JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "valid.json"), "utf8"),
  );
  const receipt = validateReleaseManifest(validData, "valid");
  assert.equal(receipt.valid, true);
  assert.ok(receipt.timestamp);
  assert.deepEqual(receipt.data, validData);
});

test("Private ARC-REL-001 fixture passes", () => {
  const arcRelData = JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "arc-rel-001.json"), "utf8"),
  );
  const receipt = validateReleaseManifest(arcRelData, "arc-rel-001");
  assert.equal(receipt.valid, true);
});

test("Non-canon OSS fixture passes", () => {
  const ossData = JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "oss-fixture.json"), "utf8"),
  );
  const receipt = validateReleaseManifest(ossData, "oss-fixture");
  assert.equal(receipt.valid, true);
});

test("Missing approval fixture fails", () => {
  const missingApprovalData = JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "missing-approval.json"), "utf8"),
  );
  assert.throws(
    () => validateReleaseManifest(missingApprovalData, "missing-approval"),
    /missing-approval\.approvals\.human: required/,
  );
});

test("Missing rights fixture fails", () => {
  const missingRightsData = JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "missing-rights.json"), "utf8"),
  );
  assert.throws(
    () => validateReleaseManifest(missingRightsData, "missing-rights"),
    /missing-rights\.rights: required/,
  );
});

test("Stale canon fixture fails", () => {
  const staleCanonData = JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "stale-canon.json"), "utf8"),
  );
  assert.throws(
    () => validateReleaseManifest(staleCanonData, "stale-canon"),
    /must be one of LOCKED, STAGING/,
  );
});
