import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The private evidence is an input. This program never uploads or copies a master.
const [inventoryPath, deliveryDirectory] = process.argv.slice(2);
if (!inventoryPath || !deliveryDirectory) {
  throw new Error("Usage: node scripts/verify-genesis-plates.mjs INVENTORY_JSON PUBLIC_RENDITION_DIRECTORY");
}
const plates = JSON.parse(await readFile(new URL("../apps/web/lib/genesis/published-plates.json", import.meta.url)));
const { items } = JSON.parse(await readFile(inventoryPath));
assert.equal(plates.length, 10);
assert.equal(new Set(plates.map((plate) => plate.assetId)).size, plates.length);
for (const plate of plates) {
  assert.match(plate.slug, /^[a-z]+$/);
  const records = items.filter((record) => record.asset_id === plate.assetId);
  assert.equal(records.length, 1, plate.slug);
  const [record] = records;
  assert.equal(record.role, "Published variant");
  assert.equal(plate.src, record.source_url);
  assert.equal(plate.width, record.width);
  assert.equal(plate.height, record.height);
  assert.equal(plate.sha256, record.sha256);
  const url = new URL(plate.src);
  assert.equal(url.origin, "https://res.cloudinary.com");
  assert.equal(url.search, "");
  assert.match(url.pathname, /^\/alljsqnj\/image\/upload\/v\d+\/arcanea\/bestiary\/mythic-commons\/volume-01\/published\/[a-z]+\.webp$/);
  assert.equal(url.pathname.split("/").at(-1), plate.slug + ".webp");
  const bytes = await readFile(join(deliveryDirectory, "published-" + plate.slug + ".webp"));
  assert.equal(bytes.length, record.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), plate.sha256);
}
console.log("10/10 published field plates match the DAM export, source URL, dimensions and downloaded byte hashes.");
