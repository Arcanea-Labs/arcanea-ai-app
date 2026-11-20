import { expect, test } from "@playwright/test";

const gallery = "/gallery/living-art";
const views = [
  "/gallery",
  "/inventory",
  "/collections/mythic-commons",
  "/art/kelpie",
  "/characters/seli",
  "/atlas",
  "/studio/visual",
];

test("every review surface remains legible across three viewport widths", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of views) {
      await page.goto(gallery + "#" + view);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Work unavailable" }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const lead = page.locator("main img").first();
      if (await lead.count()) {
        await lead.scrollIntoViewIfNeeded();
        await expect
          .poll(() => lead.evaluate((el: HTMLImageElement) => el.naturalWidth))
          .toBeGreaterThan(0);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await page.screenshot({
        path: info.outputPath(
          width + "-" + view.slice(1).replaceAll("/", "-") + ".png",
        ),
        animations: "disabled",
      });
    }
  }
});

test("the inventory links a published plate to its traceable, read-only record", async ({
  page,
}) => {
  await page.goto(gallery + "#/inventory");
  const search = page.getByRole("searchbox", { name: "Search the inventory" });
  await search.fill("no-such-artwork-391");
  await expect(
    page.getByRole("heading", { name: "No matching works" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "More filters" }).click();
  await page
    .getByLabel("Collection", { exact: true })
    .selectOption("Mythic Commons");
  await expect(page.locator("#inventory-results article")).toHaveCount(10);
  await search.fill("Kelpie");
  await expect(page.locator("#inventory-results article")).toHaveCount(1);
  await page.locator('#inventory-results a[href="#/art/kelpie"]').click();
  await expect(page.locator("main h1")).toContainText("Kelpie");
  await page.getByText("Provenance & rights", { exact: true }).click();
  await expect(
    page.getByText("Observed SHA-256", { exact: true }),
  ).toBeVisible();
  const enlarge = page.getByRole("button", { name: /Enlarge artwork/ });
  await enlarge.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(enlarge).toBeFocused();
  await expect(
    page.getByRole("link", { name: /buy now|checkout/i }),
  ).toHaveCount(0);
});

test("the artwork stage reserves its frame while the plate is loading", async ({
  page,
}) => {
  // Capture the real published plate once, then release those same bytes on demand.
  const delivery = page.waitForResponse(
    (response) =>
      response.url().endsWith("/published/kelpie.webp") &&
      response.status() === 200,
  );
  await page.goto(gallery + "#/art/kelpie");
  const bytes = await (await delivery).body();
  let releaseImage: () => void = () => {};
  const imageReady = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route("**/published/kelpie.webp", async (request) => {
    await imageReady;
    await request.fulfill({
      status: 200,
      contentType: "image/webp",
      body: bytes,
    });
  });
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    const frame = page.locator(".artstage");
    const image = frame.locator("img");
    await expect(image).toHaveAttribute("width", "1024");
    await expect(image).toHaveAttribute("height", "1536");
    const before = await frame.boundingBox();
    releaseImage();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBe(1024);
    expect(await frame.boundingBox()).toEqual(before);
  } finally {
    releaseImage();
  }
});
