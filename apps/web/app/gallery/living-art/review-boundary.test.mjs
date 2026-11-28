import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { GET } from "./[[...resource]]/route.ts";

const address = "https://review.example/gallery/living-art";
const get = (resource) =>
  GET(new Request(address), { params: Promise.resolve({ resource }) });

test("the review surface fails closed outside local development and protected previews", async (t) => {
  for (const [target, mode] of [
    ["production", "production"],
    ["production", "development"],
    ["staging", "production"],
    ["", "production"],
    ["", "test"],
  ]) {
    await t.test(`${target || "unset"} / ${mode}`, async () => {
      const oldTarget = process.env.VERCEL_ENV;
      const oldMode = process.env.NODE_ENV;
      try {
        process.env.VERCEL_ENV = target;
        process.env.NODE_ENV = mode;
        for (const path of [
          [],
          ["index.html"],
          ["review.js"],
          ["catalog.js"],
          ["review.css"],
          ["tokens.css"],
        ]) {
          const response = await get(path);
          assert.equal(response.status, 404);
          assert.equal(await response.text(), "");
          assert.equal(
            response.headers.get("cache-control"),
            "private, no-store",
          );
        }
      } finally {
        if (oldTarget === undefined) delete process.env.VERCEL_ENV;
        else process.env.VERCEL_ENV = oldTarget;
        if (oldMode === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = oldMode;
      }
    });
  }
});

test("only the packaged public projection can be served in preview", async () => {
  const original = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    for (const path of [
      ["other.js"],
      [".."],
      ["..", "index.html"],
      ["review.js", "extra"],
      ["private.json"],
    ]) {
      assert.equal((await get(path)).status, 404);
    }
    for (const [path, type] of [
      ["index.html", "text/html"],
      ["catalog.js", "text/javascript"],
      ["review.js", "text/javascript"],
      ["review.css", "text/css"],
      ["tokens.css", "text/css"],
    ]) {
      const response = await get(path === "index.html" ? [] : [path]);
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("content-type"),
        type + "; charset=utf-8",
      );
      assert.equal(
        response.headers.get("x-robots-tag"),
        "noindex, nofollow, noarchive",
      );
      assert.equal(
        await response.text(),
        await readFile(
          path === "tokens.css"
            ? "../../packages/design-system/src/tokens.css"
            : `app/gallery/living-art/_experience/${path}`,
          "utf8",
        ),
      );
    }
  } finally {
    if (original === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original;
  }
});
