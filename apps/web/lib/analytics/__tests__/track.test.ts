import { strict as assert } from "node:assert";
import { test } from "node:test";
import { priceBand, trackEvent } from "../track";
import { parseUtmSource, withUtm } from "../utm";

test("trackEvent forwards name and props", () => {
  const calls: Array<[string, Record<string, string>]> = [];
  trackEvent(
    "waitlist_join",
    { product: "arcanea", source: "footer" },
    { send: (n, p) => calls.push([n, p]), utmSource: undefined },
  );
  assert.deepEqual(calls, [
    ["waitlist_join", { product: "arcanea", source: "footer" }],
  ]);
});

test("trackEvent adds inbound utm_source", () => {
  const calls: Array<[string, Record<string, string>]> = [];
  trackEvent(
    "cta_click",
    { cta: "start", location: "home" },
    { send: (n, p) => calls.push([n, p]), utmSource: "linkedin" },
  );
  assert.equal(calls[0][1].utm_source, "linkedin");
});

test("trackEvent swallows sender errors", () => {
  trackEvent(
    "checkout_start",
    { product: "creator", price_band: "10_to_49" },
    {
      send: () => {
        throw new Error("boom");
      },
      utmSource: undefined,
    },
  );
});

test("priceBand buckets cents", () => {
  assert.equal(priceBand(0), "free");
  assert.equal(priceBand(500), "under_10");
  assert.equal(priceBand(1900), "10_to_49");
  assert.equal(priceBand(7900), "50_plus");
});

test("withUtm appends params and keeps query + hash", () => {
  assert.equal(
    withUtm("https://arcanea.ai/pricing?a=1#top", {
      source: "x",
      medium: "social",
      campaign: "2026-11-launch",
    }),
    "https://arcanea.ai/pricing?a=1&utm_source=x&utm_medium=social&utm_campaign=2026-11-launch#top",
  );
});

test("withUtm rejects invalid values", () => {
  assert.throws(() =>
    withUtm("/", { source: "X Y", medium: "social", campaign: "2026-11-a" }),
  );
  assert.throws(() =>
    withUtm("/", {
      source: "x",
      medium: "ads" as never,
      campaign: "2026-11-a",
    }),
  );
  assert.throws(() =>
    withUtm("/", { source: "x", medium: "social", campaign: "launch" }),
  );
  assert.throws(() =>
    withUtm("/", { source: "x", medium: "social", campaign: "2026-13-a" }),
  );
});

test("parseUtmSource sanitizes", () => {
  assert.equal(parseUtmSource("LinkedIn"), "linkedin");
  assert.equal(parseUtmSource("a@b.com"), undefined);
  assert.equal(parseUtmSource(null), undefined);
});
