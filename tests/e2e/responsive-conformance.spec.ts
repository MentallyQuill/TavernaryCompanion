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

test("mobile personal Kits match the shared catalog grammar", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page.getByRole("combobox", { name: "Browse Companion" }).selectOption("kits");
  await page.getByRole("tab", { name: /Personal/ }).click();
  await expect(page.locator(".tavernary-companion-kit-card").first()).toBeVisible();
  await expect(page).toHaveScreenshot("kits-390x844.png");
});

test("mobile Installed matches the shared catalog grammar", async ({ page }) => {
  await prepare(page, { width: 390, height: 844 });
  await page.getByRole("combobox", { name: "Browse Companion" }).selectOption("installed");
  await expect(page.locator(".tavernary-companion-installed-section").first()).toBeVisible();
  await expect(page).toHaveScreenshot("installed-390x844.png");
});

async function prepare(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.clock.setFixedTime(new Date("2026-08-18T18:00:00-06:00"));
  await openHarness(page);
  await page.evaluate(() => document.fonts.ready);
}
