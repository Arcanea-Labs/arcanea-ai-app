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
  assert.equal(priceBand(4999), "10_to_49");
  assert.equal(priceBand(5000), "50_plus");
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

function capture(
  name: unknown,
  props: unknown,
  utmSource?: string,
): Array<[string, Record<string, string>]> {
  const calls: Array<[string, Record<string, string>]> = [];
  trackEvent(name as "cta_click", props as { cta: string; location: string }, {
    send: (n, p) => calls.push([n, p]),
    utmSource,
  });
  return calls;
}

test("guard drops unsupported event names", () => {
  assert.equal(capture("page_view", { cta: "a", location: "b" }).length, 0);
  assert.equal(capture("constructor", { cta: "a", location: "b" }).length, 0);
});

test("guard drops extra keys such as a prompt field", () => {
  assert.equal(
    capture("cta_click", { cta: "a", location: "b", prompt: "hi" }).length,
    0,
  );
});

test("guard drops missing keys", () => {
  assert.equal(capture("cta_click", { cta: "a" }).length, 0);
});

test("guard drops email-shaped and free-text values", () => {
  assert.equal(
    capture("cta_click", { cta: "a@b.com", location: "home" }).length,
    0,
  );
  assert.equal(
    capture("cta_click", { cta: "hello world", location: "home" }).length,
    0,
  );
  assert.equal(
    capture("cta_click", { cta: "x".repeat(65), location: "home" }).length,
    0,
  );
});

test("guard drops out-of-enum price bands", () => {
  assert.equal(
    capture("checkout_start", { product: "creator", price_band: "19.00" })
      .length,
    0,
  );
});

test("guard revalidates dependency-supplied utm_source", () => {
  const ok = capture("cta_click", { cta: "a", location: "b" }, "a@b.com");
  assert.equal(ok.length, 1);
  assert.equal("utm_source" in ok[0][1], false);
});

test("guard accepts catalog ids with hyphens and sends declared keys only", () => {
  const calls = capture(
    "checkout_start",
    { product: "pack-500", price_band: "under_10" },
    "x",
  );
  assert.deepEqual(calls, [
    [
      "checkout_start",
      { product: "pack-500", price_band: "under_10", utm_source: "x" },
    ],
  ]);
});

test("guard tolerates non-object props without throwing", () => {
  assert.equal(capture("cta_click", null).length, 0);
  assert.equal(capture("cta_click", "str").length, 0);
});
