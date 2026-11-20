import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

const gallery = "/collections/genesis";
const rehearsal =
  process.env.ARCANEA_GENESIS_PREVIEW === "1" &&
  process.env.ARCANEA_GENESIS_REHEARSAL === "local";

test("private collection is unavailable by default", async ({ request }) => {
  test.skip(rehearsal, "This instance explicitly enables the rehearsal.");
  const r = await request.get(gallery);
  expect(r.status()).toBe(404);
});

test("published folio plates render and retain their source identity", async ({
  page,
}) => {
  test.skip(!rehearsal, "Run on the explicitly enabled local rehearsal.");
  await page.goto(gallery);
  await expect(
    page.getByRole("heading", { name: "The Mythic Commons." }),
  ).toBeVisible();
  const links = page.locator("#plates a");
  await expect(links).toHaveCount(10);
  await links.first().click();
  await expect(
    page.getByRole("heading", { name: "Phoenix", exact: true }),
  ).toBeVisible();
  await page.getByText("Image provenance", { exact: true }).click();
  await expect(
    page.getByText(
      "e0922c9ac0abd9d8ccdd3de8f21271d88d4e233819ad15f97a5c5631f2cd9432",
    ),
  ).toBeVisible();
  for (const image of await page
    .locator('section[aria-label="Arcanea Genesis"] img')
    .all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
});

test("rehearsal delivers only the displayed file, permission and receipt", async ({
  page,
}) => {
  test.skip(!rehearsal, "Run on the explicitly enabled local rehearsal.");
  await page.goto("/account/library");
  await expect(page.getByText("Your shelf is empty")).toBeVisible();
  await page.getByRole("link", { name: "Open delivery rehearsal" }).click();
  const { offer } = await (
    await page.request.get("/api/genesis/preview/library")
  ).json();
  await expect(page.getByRole("heading", { name: offer.title })).toBeVisible();
  const submit = page.getByRole("button", { name: "Rehearse checkout" });
  await submit.click();
  await expect(page.locator("input:invalid")).toHaveCount(3);
  for (const check of await page.getByRole("checkbox").all())
    await check.check();
  await submit.click();
  await page.getByRole("link", { name: "Open my library" }).click();
  const link = page.getByRole("link", { name: "Download file" });
  const url = await link.getAttribute("href");
  expect(url).toBeTruthy();
  const file = await page.request.get(url!);
  expect(file.ok()).toBe(true);
  expect(
    createHash("sha256")
      .update(await file.body())
      .digest("hex"),
  ).toBe(offer.sha256);
  for (const name of ["License", "Receipt"]) {
    const href = await page
      .getByRole("link", { name, exact: true })
      .getAttribute("href");
    expect((await page.request.get(href!)).status()).toBe(200);
  }
});
