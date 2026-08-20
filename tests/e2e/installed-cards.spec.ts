import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("Installed reports loading until initial host discovery completes", async ({ page }) => {
  await openHarness(page, "initial-loading");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  await expect(page.getByText("Loading installed extensions…", { exact: true })).toBeVisible();
  await expect(page.getByText("0 installed extensions")).toHaveCount(0);
  await expect(page.getByText("No installed extensions were found in this profile.")).toHaveCount(
    0,
  );

  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-release-inventory"));
  });
  await expect(page.getByText("1 installed extension")).toBeVisible();
  await expect(page.getByText("Loading installed extensions…")).toHaveCount(0);
});

test("Installed serializes overlapping discovery requests", async ({ page }) => {
  await openHarness(page, "overlapping-inventory");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  await expect(page.getByText("Loading installed extensions…", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-release-inventory-2"));
  });
  await expect(page.getByText("Loading installed extensions…", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-release-inventory-1"));
  });
  await expect(page.getByText("1 installed extension")).toBeVisible();
  await expect(page.getByText("No installed extensions were found in this profile.")).toHaveCount(
    0,
  );
});

test("Installed uses four desktop columns when its content width permits them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const grid = page.locator(".tavernary-companion-installed-grid").first();
  const columns = await grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u),
  );
  expect(columns).toHaveLength(4);
  expect(await grid.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test("Installed clips extension names that exceed their card width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page, "installed-long-name");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const title = page.getByRole("heading", {
    name: "SillyTavern Extension With An Intentionally Long Installed Name",
  });
  await expect(title).toHaveCSS("overflow", "hidden");
  await expect(title).toHaveCSS("text-overflow", "ellipsis");
  await expect(title).toHaveCSS("white-space", "nowrap");
  expect(
    await title.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
  ).toMatchObject({ clientWidth: expect.any(Number), scrollWidth: expect.any(Number) });
  expect(await title.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});

test("Installed groups Kits and lets extensions be enabled and restored from cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  await expect(page.getByRole("heading", { name: "Installed Kits" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
  await expect(page.getByText("In Writer's Kit")).toBeVisible();
  const cards = page.locator(".tavernary-companion-installed-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
  const kitCards = page.locator(".tavernary-companion-installed-kit-card");
  await expect(kitCards).toHaveCount(1);
  const [kitCardBox, installedCardBox] = await Promise.all([
    kitCards.first().boundingBox(),
    cards.first().boundingBox(),
  ]);
  expect(kitCardBox).not.toBeNull();
  expect(installedCardBox).not.toBeNull();
  expect(kitCardBox!.width).toBeLessThanOrEqual(installedCardBox!.width);

  const enable = page.getByRole("switch", { name: /Enable /u });
  await expect(enable).toHaveAttribute("aria-checked", "false");
  const versionStatus = enable.locator("../..").locator(":scope > header > strong");
  await expect(versionStatus).toHaveText("Latest");
  await expect(versionStatus).not.toHaveText(/Enabled|Disabled/u);
  await expect(enable.locator("b")).toHaveText("Disabled");
  const [toggleBox, trackBox, cardBox] = await Promise.all([
    enable.boundingBox(),
    enable.locator("span").boundingBox(),
    enable.locator("../..").boundingBox(),
  ]);
  expect(toggleBox).not.toBeNull();
  expect(trackBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
  expect(trackBox!.width).toBe(42);
  expect(trackBox!.height).toBe(24);
  expect(cardBox!.height).toBeLessThanOrEqual(160);
  await expect(enable.locator("b")).toHaveCSS("font-size", "11px");
  await expect(enable.locator("b")).toHaveCSS("font-weight", "700");

  await enable.click();
  const disable = page.getByRole("switch", { name: /Disable /u });
  await expect(disable).toHaveAttribute("aria-checked", "true");

  await disable.click();
  await expect(page.getByRole("switch", { name: /Enable /u })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});
