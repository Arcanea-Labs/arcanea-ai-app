// Verify an already running, explicitly enabled local Next app using a fresh review session.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

const base = new URL(process.argv[2] || "http://localhost:3001");
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname))
  throw Error("Use a loopback preview.");
const api = new URL("/api/genesis/preview/", base);
const sha256 = (bytes) =>
  createHash("sha256").update(Buffer.from(bytes)).digest("hex");
const jar = async () => {
  const res = await fetch(new URL("library", api), { redirect: "error" });
  assert.equal(res.status, 200);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return { cookie, data: await res.json() };
};
const {
  cookie,
  data: { offer, items },
} = await jar();
assert.equal(items.length, 0);
const headers = {
  Origin: base.origin,
  Cookie: cookie,
  "Idempotency-Key": randomUUID(),
  "Content-Type": "application/json",
};
const body = JSON.stringify({
  edition: "genesis-digital",
  fileSha256: offer.sha256,
  licenseSha256: offer.licenseSha256,
  acceptLicense: true,
  immediateDelivery: true,
  acknowledgeWithdrawal: true,
});
const post = async (path) =>
  fetch(new URL(path, api), {
    method: "POST",
    headers,
    body,
    redirect: "error",
  });
const first = await post("checkout");
assert.equal(first.status, 201);
const order = await first.json();
assert.equal(order.chargedCents, 0);
const retry = await post("checkout");
assert.equal(retry.status, 200);
assert.equal((await retry.json()).orderId, order.orderId);
const library = await fetch(new URL("library", api), {
  headers: { Cookie: cookie },
  redirect: "error",
});
const [item] = (await library.json()).items;
assert.equal(item.orderId, order.orderId);
const read = (path, c = cookie) =>
  fetch(new URL(path, base), { headers: { Cookie: c }, redirect: "error" });
const outsider = await jar();
assert.equal((await read(item.downloadUrl, outsider.cookie)).status, 404);
const dl = await read(item.downloadUrl);
assert.equal(dl.status, 200);
const fileSha256 = sha256(await dl.arrayBuffer());
assert.equal(fileSha256, offer.sha256);
const license = await read(item.licenseUrl);
assert.equal(license.status, 200);
const permissionSha256 = sha256(await license.arrayBuffer());
assert.equal(permissionSha256, offer.licenseSha256);
const rec = await read(item.receiptUrl);
assert.equal(rec.status, 200);
const receipt = await rec.json();
assert.equal(receipt.fileSha256, fileSha256);
assert.equal(receipt.paymentProvider, null);
assert.equal(receipt.permissionSha256, permissionSha256);
const paid = await fetch(new URL("/api/shop/checkout", base), {
  method: "POST",
  headers: { Origin: base.origin, "Content-Type": "application/json" },
  body: JSON.stringify({ slug: "living-cosmos-first-edition" }),
  redirect: "error",
});
assert.equal(paid.status, 503);
assert.equal((await paid.json()).code, "edition_unavailable");
const canceled = await post("cancel/" + order.orderId);
assert.equal(canceled.status, 200);
assert.equal((await read(item.downloadUrl)).status, 410);
console.log(
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      origin: base.origin,
      mode: order.mode,
      sku: offer.sku,
      title: offer.title,
      fileSha256,
      permissionSha256,
      byteLength: offer.byteLength,
      receipt,
      checks: {
        freshLibrary: 200,
        checkout: 201,
        retry: 200,
        otherSession: 404,
        download: 200,
        license: 200,
        receipt: 200,
        paidCheckoutGate: 503,
        cancel: 200,
        canceledDownload: 410,
      },
    },
    null,
    2,
  ),
);
