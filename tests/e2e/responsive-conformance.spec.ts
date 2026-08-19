import { expect, test, type Page } from "@playwright/test";

import { openHarness } from "./harness";

const viewports = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 1024, height: 768 },
  { width: 1440, height: 960 },
];

for (const viewport of viewports) {
  test(`Projects conforms at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await prepare(page, viewport);
    await expect(page).toHaveScreenshot(`projects-${viewport.width}x${viewport.height}.png`);
  });
}

test("mobile filter sheet matches the Companion route", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page.getByRole("button", { name: "Open filters" }).click();
  await expect(page.getByRole("dialog", { name: "Project filters" })).toBeVisible();
  await expect(page).toHaveScreenshot("filters-390x844.png");
});

test("mobile filter sheet scrolls to the final filter group", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page.getByRole("button", { name: "Open filters" }).click();

  const sheet = page.getByRole("dialog", { name: "Project filters" });
  const panel = sheet.locator(".tavernary-companion-filter-panel");
  const licenseGroup = sheet.getByRole("group", { name: "License" });
  const dimensions = await panel.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));

  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await panel.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect(licenseGroup).toBeInViewport();
});

test("mobile personal Kits match the shared catalog grammar", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page.getByRole("button", { name: "Browse categories" }).click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("tab", { name: /Personal/ }).click();
  await expect(page.locator(".tavernary-companion-kit-card").first()).toBeVisible();
  await expect(page).toHaveScreenshot("kits-390x844.png");
});

test("mobile Installed matches the shared catalog grammar", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page.getByRole("button", { name: "Browse categories" }).click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Installed" })
    .click();
  await expect(page.locator(".tavernary-companion-installed-section").first()).toBeVisible();
  await expect(page).toHaveScreenshot("installed-390x844.png");
});

test("mobile TavernKeeper assessment matches the card grammar", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");
  await page.getByRole("button", { name: "TavernKeeper scan: Not assessed." }).click();
  await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
  await expect(page).toHaveScreenshot("tavernkeeper-390x844.png");
});

test("mobile Kit selection keeps install and Kit meanings distinct", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");
  const card = page.locator('[data-project-id="alpha"]');
  const install = card.getByRole("button", { name: "Install Alpha" });
  const kit = card.getByRole("button", { name: "Add Alpha to Kit" });
  const installFace = install.locator(".tavernary-companion-project-lifecycle__face");
  const kitFace = kit.locator(".tavernary-companion-project-kit-control__face");
  const [installBox, kitBox, installFaceBox, kitFaceBox] = await Promise.all([
    install.boundingBox(),
    kit.boundingBox(),
    installFace.boundingBox(),
    kitFace.boundingBox(),
  ]);
  expect(installBox!.width).toBe(44);
  expect(installBox!.height).toBe(44);
  expect(kitBox!.width).toBe(44);
  expect(kitBox!.height).toBe(44);
  expect(installFaceBox!.width).toBe(34);
  expect(installFaceBox!.height).toBe(34);
  expect(kitFaceBox!.width).toBe(34);
  expect(kitFaceBox!.height).toBe(34);
  await page.getByRole("button", { name: "Add Alpha to Kit" }).click();
  await expect(page.getByRole("region", { name: "1 project selected" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add 1 project to Kit" })).toBeVisible();
  await expect(page).toHaveScreenshot("kit-selection-390x844.png");
});

test("mobile lifecycle disclosure matches Tavernary surfaces", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");
  await page.getByRole("button", { name: "Install Alpha" }).click();
  await expect(
    page.getByRole("dialog", { name: "Third-party extension disclosure" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("lifecycle-disclosure-390x844.png");
});

async function prepare(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.clock.setFixedTime(new Date("2026-08-18T18:00:00-06:00"));
  await openHarness(page);
  await page.evaluate(() => document.fonts.ready);
}
