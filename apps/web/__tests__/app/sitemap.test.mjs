import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = join(__dirname, "../../app/sitemap.ts");

describe("sitemap route exclusions", () => {
  it("excludes protected /studio route while keeping public routes", () => {
    const source = readFileSync(SITEMAP_PATH, "utf8");
    assert.equal(
      /`\$\{baseUrl\}\/studio`/.test(source) || /\/studio["'`]/.test(source),
      false,
      "Expected protected /studio route to be excluded from apps/web/app/sitemap.ts",
    );
    assert.match(source, /`\$\{baseUrl\}\/chat`/);
  });
});
