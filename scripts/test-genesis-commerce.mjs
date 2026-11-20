import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  loadRehearsalOffer,
  openRehearsal,
  rehearsalEnabled,
} from "../apps/web/lib/shop/genesis-preview/rehearsal.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "../apps/web");
const origin = "http://127.0.0.1:4321";
const base = origin + "/api/genesis/preview/";
const sample = loadRehearsalOffer({}, appRoot);
const form = {
  fileSha256: sample.sha256,
  licenseSha256: sample.licenseSha256,
  edition: "genesis-digital",
  acceptLicense: true,
  immediateDelivery: true,
  acknowledgeWithdrawal: true,
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function fixture(t, offer = () => loadRehearsalOffer({}, appRoot)) {
  const directory = mkdtempSync(join(tmpdir(), "arcanea-checkout-test-"));
  const dbPath = join(directory, "review.sqlite");
  let time = Date.UTC(2026, 10, 20, 19);
  const store = openRehearsal({ dbPath, offer, now: () => time });
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const get = (path, cookie) =>
    store.handle(
      new Request(base + path, { headers: cookie ? { cookie } : {} }),
    );
  const post = (
    path,
    cookie,
    body = form,
    key = "check-one",
    requestOrigin = origin,
  ) =>
    store.handle(
      new Request(base + path, {
        method: "POST",
        headers: {
          origin: requestOrigin,
          cookie: cookie || "",
          "Idempotency-Key": key,
          "Content-Type": "application/json",
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  const session = async () =>
    (await get("library")).headers.get("set-cookie").split(";")[0];
  return {
    dbPath,
    handle: store.handle,
    get,
    post,
    session,
    directory,
    advance: (ms) => {
      time += ms;
    },
  };
}

test("Next-normalized loopback requests retain the browser Host, port and scheme", async (t) => {
  const { handle, session } = fixture(t);
  const cookie = await session();
  const request = (host, origin, forwarded = "") =>
    handle(
      new Request("http://localhost:4321/api/genesis/preview/checkout", {
        method: "POST",
        body: JSON.stringify(form),
        headers: {
          Host: host,
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
          "Idempotency-Key": "origin-check",
          "X-Forwarded-Host": forwarded,
        },
      }),
    );
  assert.equal(
    (await request("127.0.0.1:4321", "http://127.0.0.1:4321")).status,
    201,
  );
  assert.equal((await request("[::1]:4321", "http://[::1]:4321")).status, 200);
  assert.equal(
    (await request("localhost:4321", "http://127.0.0.1:4321")).status,
    403,
  );
  assert.equal(
    (await request("127.0.0.1:4321", "https://127.0.0.1:4321")).status,
    403,
  );
  assert.equal(
    (await request("127.0.0.1:4321", "http://127.0.0.1:9999")).status,
    403,
  );
  assert.equal(
    (await request("127.0.0.1:4321", "https://other.example", "other.example"))
      .status,
    403,
  );
  assert.equal(
    (await request("other.example", "https://other.example", "localhost:4321"))
      .status,
    404,
  );
  assert.equal(
    (await request("127.0.0.1:9999", "http://127.0.0.1:9999")).status,
    404,
  );
  assert.equal(
    (
      await handle(
        new Request(base + "library", { headers: { host: "other.example" } }),
      )
    ).status,
    404,
  );
});

test("rehearsal requires opt-in, a loopback URL and non-production, non-Vercel runtime", () => {
  const env = { ARCANEA_GENESIS_REHEARSAL: "local" };
  assert.equal(rehearsalEnabled(env, base), true);
  for (const bad of [
    {},
    { ...env, VERCEL: "1" },
    { ...env, NODE_ENV: "production" },
  ]) {
    assert.equal(rehearsalEnabled(bad, base), false);
  }
  for (const host of [
    "arcanea.ai",
    "www.arcanea.ai",
    "example.vercel.app",
    "127.0.0.1.example.com",
  ]) {
    assert.equal(rehearsalEnabled(env, "http://" + host), false);
  }
});

test("confirmed checkout delivers the exact bytes and permission with an own-session receipt", async (t) => {
  const { get, post } = fixture(t);
  const empty = await get("library");
  assert.match(empty.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  const cookie = empty.headers.get("set-cookie").split(";")[0];
  const { items, offer } = await empty.json();
  assert.equal(items.length, 0);
  const response = await post("checkout", cookie);
  assert.equal(response.status, 201);
  const order = await response.json();
  assert.equal(order.chargedCents, 0);
  const {
    items: [item],
  } = await (await get("library", cookie)).json();
  assert.equal(item.orderId, order.orderId);
  const download = await get("download/" + order.orderId, cookie);
  assert.match(download.headers.get("cache-control"), /no-store/);
  assert.match(download.headers.get("content-disposition"), /attachment/);
  assert.equal(hash(Buffer.from(await download.arrayBuffer())), offer.sha256);
  const license = await get("license/" + order.orderId, cookie);
  assert.equal(
    hash(Buffer.from(await license.arrayBuffer())),
    offer.licenseSha256,
  );
  const receipt = await (await get("receipt/" + order.orderId, cookie)).json();
  assert.equal(receipt.paymentProvider, null);
  assert.equal(receipt.fileSha256, offer.sha256);
  assert.equal(receipt.permissionSha256, offer.licenseSha256);
  assert.equal(receipt.accepted.acknowledgeWithdrawal, true);
  assert.equal(receipt.mode, "local-rehearsal");
});

test("repeat/concurrent intents grant once and record checkout once", async (t) => {
  const { dbPath, session, post, get } = fixture(t);
  const cookie = await session();
  const responses = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      post("checkout", cookie, form, i % 2 ? "first-key" : "second-key"),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  const orders = await Promise.all(responses.map((r) => r.json()));
  assert.equal(new Set(orders.map((o) => o.orderId)).size, 1);
  assert.equal((await (await get("library", cookie)).json()).items.length, 1);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  t.after(() => db.close());
  const metrics = db
    .prepare("SELECT name,COUNT(*) AS n FROM events GROUP BY name")
    .all();
  for (const name of ["preview_access_granted", "preview_checkout_confirmed"])
    assert.equal(metrics.find((x) => x.name === name)?.n, 1);
});

test("cross-account, missing-session and expired-session downloads are denied", async (t) => {
  const { session, post, get, advance } = fixture(t);
  const owner = await session(),
    other = await session();
  const { orderId } = await (await post("checkout", owner)).json();
  for (const action of ["download", "license", "receipt"]) {
    assert.equal((await get(action + "/" + orderId)).status, 401);
    assert.equal((await get(action + "/" + orderId, other)).status, 404);
  }
  assert.equal((await post("cancel/" + orderId, other)).status, 404);
  advance(4 * 60 * 60 * 1000);
  assert.equal((await get("download/" + orderId, owner)).status, 401);
});

test("invalid input, withdrawn consent and foreign origin create no access", async (t) => {
  const { session, post, get } = fixture(t);
  const cookie = await session();
  assert.equal((await post("checkout", null)).status, 401);
  assert.equal(
    (
      await post(
        "checkout",
        cookie,
        form,
        "request-id",
        "https://other.example",
      )
    ).status,
    403,
  );
  for (const flag of [
    "acceptLicense",
    "acknowledgeWithdrawal",
    "immediateDelivery",
  ])
    assert.equal(
      (await post("checkout", cookie, { ...form, [flag]: false })).status,
      422,
    );
  assert.equal(
    (await post("checkout", cookie, { ...form, price: 1900 })).status,
    400,
  );
  assert.equal((await post("checkout", cookie, "not json")).status, 400);
  assert.equal((await post("checkout", cookie, "x".repeat(2100))).status, 413);
  assert.equal((await post("checkout", cookie, form, "bad")).status, 400);
  assert.equal((await get("checkout", cookie)).status, 405);
  assert.equal((await (await get("library", cookie)).json()).items.length, 0);
});

test("an unsubmitted checkout cannot accept replaced bytes or terms", async (t) => {
  let product = sample;
  const { get, session, post } = fixture(t, () => product);
  const cookie = await session();
  const first = (await (await get("library", cookie)).json()).offer;
  const submit = (patch) => post("checkout", cookie, { ...form, ...patch });
  for (const missing of ["fileSha256", "licenseSha256"])
    assert.equal((await submit({ [missing]: undefined })).status, 422);

  product = { ...sample, sha256: hash("new file") };
  assert.equal((await submit({})).status, 409);
  product = { ...sample, licenseSha256: hash("new terms") };
  assert.equal(
    (await get("terms?sha256=" + first.licenseSha256, cookie)).status,
    409,
  );
  assert.equal((await submit({})).status, 409);

  const updated = await (await get("library", cookie)).json();
  assert.equal(updated.items.length, 0);
  const current = {
    fileSha256: updated.offer.sha256,
    licenseSha256: updated.offer.licenseSha256,
  };
  const granted = await submit(current);
  assert.equal(granted.status, 201);
  assert.equal((await submit(current)).status, 200);
  const { orderId } = await granted.json();
  const receipt = await (await get("receipt/" + orderId, cookie)).json();
  assert.equal(receipt.fileSha256, current.fileSha256);
  assert.equal(receipt.permissionSha256, current.licenseSha256);
});

test("canceling is idempotent, revokes file access and retains the review confirmation", async (t) => {
  const { session, post, get } = fixture(t);
  const cookie = await session();
  const { orderId } = await (await post("checkout", cookie)).json();
  assert.equal((await post("cancel/" + orderId, cookie)).status, 200);
  assert.equal((await post("cancel/" + orderId, cookie)).status, 200);
  assert.equal((await get("download/" + orderId, cookie)).status, 410);
  assert.equal((await post("checkout", cookie)).status, 409);
  const receipt = await (await get("receipt/" + orderId, cookie)).json();
  assert.equal(receipt.status, "canceled");
  assert.equal(receipt.chargedCents, 0);
});

test("substituted asset or permission bytes, missing pins and partial configuration fail closed", async (t) => {
  const original = loadRehearsalOffer({}, appRoot);
  let data = original;
  const { directory, session, post, get } = fixture(t, () => data);
  const cookie = await session();
  const { orderId } = await (await post("checkout", cookie)).json();
  data = { ...original, licenseSha256: "0".repeat(64) };
  assert.equal((await post("checkout", cookie)).status, 409);
  assert.equal((await get("download/" + orderId, cookie)).status, 503);
  const file = join(directory, "payload.zip");
  writeFileSync(file, "test");
  assert.throws(() =>
    loadRehearsalOffer({ ARCANEA_GENESIS_PREVIEW_ZIP: file }, appRoot),
  );
  const env = {
    ARCANEA_GENESIS_PREVIEW_ZIP: file,
    ARCANEA_GENESIS_PREVIEW_SHA256: hash("test"),
    ARCANEA_GENESIS_PREVIEW_LICENSE: file,
    ARCANEA_GENESIS_PREVIEW_LICENSE_SHA256: hash("test"),
  };
  assert.equal(
    loadRehearsalOffer(env, appRoot).filename,
    "genesis-the-phoenix-screen.zip",
  );
  writeFileSync(file, "altered");
  assert.throws(() => loadRehearsalOffer(env, appRoot));
});

test(
  "operator-supplied folio is served exactly as pinned through checkout, library, license and receipt",
  {
    skip:
      !process.env.ARCANEA_GENESIS_PREVIEW_ZIP &&
      "Private folio paths and digests are supplied outside Git.",
  },
  async (t) => {
    const { session, post, get } = fixture(t, () =>
      loadRehearsalOffer(process.env, appRoot),
    );
    const cookie = await session();
    const displayed = (await (await get("library", cookie)).json()).offer;
    const { orderId } = await (
      await post("checkout", cookie, {
        ...form,
        fileSha256: displayed.sha256,
        licenseSha256: displayed.licenseSha256,
      })
    ).json();
    const {
      items: [{ sha256 }],
      offer,
    } = await (await get("library", cookie)).json();
    assert.equal(offer.title, "The Phoenix Screen");
    const bytes = Buffer.from(
      await (await get("download/" + orderId, cookie)).arrayBuffer(),
    );
    assert.equal(hash(bytes), sha256);
    assert.deepEqual(
      bytes,
      readFileSync(process.env.ARCANEA_GENESIS_PREVIEW_ZIP),
    );
    const note = Buffer.from(
      await (await get("license/" + orderId, cookie)).arrayBuffer(),
    );
    assert.deepEqual(
      note,
      readFileSync(process.env.ARCANEA_GENESIS_PREVIEW_LICENSE),
    );
    const receipt = await (await get("receipt/" + orderId, cookie)).json();
    assert.equal(receipt.fileSha256, hash(bytes));
    assert.equal(receipt.permissionSha256, hash(note));
  },
);
