import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { operatorSnapshot } from "../apps/web/lib/shop/genesis-preview/operator-snapshot.mjs";

test("private review requires loopback, reviewer credentials and an exact snapshot", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "genesis-operator-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "asset.html");
  const bytes = "<p>Approved for private viewing</p>";
  await writeFile(file, bytes);
  const pass = "independent-local-review-fixture-only";
  const env = {
    ARCANEA_GENESIS_REHEARSAL: "local",
    ARCANEA_GENESIS_REVIEW_PASSWORD: pass,
    ARCANEA_GENESIS_ASSET_REVIEW_HTML: file,
    ARCANEA_GENESIS_ASSET_REVIEW_SHA256: createHash("sha256")
      .update(bytes)
      .digest("hex"),
  };
  const headers = {
    host: "localhost:3000",
    authorization:
      "Basic " + Buffer.from("reviewer:" + pass).toString("base64"),
  };
  const request = (values = headers) =>
    new Request("http://localhost:3000/admin/assets", { headers: values });
  assert.equal(
    (
      await operatorSnapshot(request(), "assets", {
        ...env,
        VERCEL_ENV: "preview",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await operatorSnapshot(request(), "assets", {
        ...env,
        NODE_ENV: "production",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await operatorSnapshot(
        request({ ...headers, host: "example.org" }),
        "assets",
        env,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await operatorSnapshot(
        request({ ...headers, "x-forwarded-host": "example.org" }),
        "assets",
        env,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await operatorSnapshot(
        request({ ...headers, authorization: "" }),
        "assets",
        env,
      )
    ).status,
    401,
  );
  assert.equal(
    (await operatorSnapshot(request(), "releases", env)).status,
    503,
  );
  const response = await operatorSnapshot(request(), "assets", env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), bytes);
  assert.match(
    response.headers.get("Content-Security-Policy"),
    /sandbox allow-scripts/,
  );
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  await writeFile(file, "new revision");
  assert.equal((await operatorSnapshot(request(), "assets", env)).status, 503);
});
