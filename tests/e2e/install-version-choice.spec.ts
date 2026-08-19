import { expect, test, type Locator, type Page } from "@playwright/test";

import { openHarness } from "./harness";

const prohibitedChoiceClaims = /\b(?:safe|unsafe|secure|risky|verified|recommended)\b/iu;
const fullSha = /\b[0-9a-f]{40}\b/iu;

test("offers plain Checked and Newest choices only when they differ", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openVersionChoice(page, "version-choice");

  const install = installAlpha(page);
  await install.click();
  const chooser = page.getByRole("dialog", { name: "Which version would you like?" });

  await expect(chooser).toBeVisible();
  await expect(
    chooser.getByRole("button", { name: "Checked version" }),
  ).toHaveAccessibleDescription("TavernKeeper checked this version on Aug 17.");
  await expect(chooser.getByRole("button", { name: "Newest version" })).toHaveAccessibleDescription(
    "The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.",
  );
  expect(await chooser.textContent()).not.toMatch(prohibitedChoiceClaims);
  expect(await chooser.textContent()).not.toMatch(fullSha);
  await expect(page).toHaveScreenshot("checked-or-newest-1440x960.png");

  await page.keyboard.press("Escape");
  await expect(chooser).not.toBeVisible();
  await expect(install).toBeFocused();
});

test.describe("touch choice", () => {
  test.use({ hasTouch: true });

  test("keeps the chooser on screen and installs the tapped choice", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openVersionChoice(page, "version-choice");

    await installAlpha(page).tap();
    const chooser = page.getByRole("dialog", { name: "Which version would you like?" });
    await expect(chooser).toBeVisible();
    await expectContained(page, chooser);
    await expect(page).toHaveScreenshot("checked-or-newest-390x844.png");

    await chooser.getByRole("button", { name: "Newest version" }).tap();
    await expect(page.getByText("Installed the newest version.", { exact: true })).toBeVisible();
  });
});

test("installs the one meaningful target without asking", async ({ page }) => {
  await openVersionChoice(page, "version-matching");
  await installAlpha(page).click();
  await expect(page.getByRole("dialog", { name: "Which version would you like?" })).toHaveCount(0);
  await expect(page.getByText("Installed the checked version.", { exact: true })).toBeVisible();

  await openVersionChoice(page, "version-unscanned");
  await installAlpha(page).click();
  await expect(page.getByRole("dialog", { name: "Which version would you like?" })).toHaveCount(0);
  await expect(page.getByText("Installed the newest version.", { exact: true })).toBeVisible();
});

test("keeps Checked visible but unavailable on an older host", async ({ page }) => {
  await openVersionChoice(page, "version-legacy");
  await installAlpha(page).click();

  const chooser = page.getByRole("dialog", { name: "Which version would you like?" });
  await expect(chooser.getByRole("button", { name: "Checked version" })).toBeDisabled();
  await expect(chooser).toContainText("Update SillyTavern to use the checked version.");
  await expect(chooser.getByRole("button", { name: "Newest version" })).toBeEnabled();
});

test("keeps mixed Kit choices in one preflight list at 200% zoom", async ({ page }) => {
  // A 512x384 CSS viewport models a 1024x768 screen at 200% browser zoom.
  await page.setViewportSize({ width: 512, height: 384 });
  await openHarness(page, "kit-version-choice");
  await page.getByRole("button", { name: "Browse categories" }).click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await page.getByRole("button", { name: "Install Kit" }).click();

  const preflight = page.getByRole("dialog", { name: "Install Kit review" });
  await expect(preflight.getByRole("heading", { name: "Install", exact: true })).toHaveCount(1);
  await expect(preflight).toContainText("Same Version");
  await expect(preflight).toContainText("Different Version");
  await expect(preflight).toContainText("No Check Yet");
  expect(await preflight.textContent()).not.toMatch(fullSha);
  const confirm = preflight.getByRole("button", { name: "Install Kit" });
  await expect(confirm).toBeDisabled();
  await preflight.getByRole("radio", { name: "Checked version for Different Version" }).click();
  await expect(confirm).toBeEnabled();
  await expectContained(page, preflight);
});

async function openVersionChoice(page: Page, scenario: string): Promise<void> {
  await page.clock.setFixedTime(new Date("2026-08-19T18:00:00-06:00"));
  await openHarness(page, scenario);
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");
}

function installAlpha(page: Page): Locator {
  return page.locator('[data-project-id="alpha"]').getByRole("button", { name: "Install Alpha" });
}

async function expectContained(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  expect(await locator.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
}
