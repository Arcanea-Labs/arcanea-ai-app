import assert from "node:assert/strict";
import test from "node:test";
import { GENESIS_STUDY_REVIEW, SHOP_EDITIONS, editionReleased } from "../apps/web/lib/shop/catalog.ts";
import { checkoutUrlForEdition, prepareCheckout } from "../apps/web/lib/shop/checkout";

test("the Genesis study has a proposed price and cannot enter public checkout", () => {
  const edition = GENESIS_STUDY_REVIEW;
  assert.equal(edition.sku, "GENESIS-STUDY-01");
  assert.equal(edition.priceState, "proposed");
  assert.equal(edition.priceEur, 9);
  assert.equal(editionReleased(edition), false);
  assert.ok(!SHOP_EDITIONS.some((listed) => listed.slug === edition.slug));
  const configuration = { [edition.checkoutEnv]: "https://buy.polar.sh/example" };
  assert.equal(checkoutUrlForEdition(edition, configuration), null);
  assert.equal(prepareCheckout({ slug: edition.slug }, configuration).status, 404);
});
