import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("checks and directly applies a single Installed extension update", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "installed-update");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const card = page.locator(".tavernary-companion-installed-card", {
    has: page.getByRole("heading", { name: "Writer Tool" }),
  });
  await expect(card.getByText("Latest scanned")).toBeVisible();
  const update = card.getByRole("button", { name: "Update Writer Tool" });
  const uninstall = card.getByRole("button", { name: "Uninstall Writer Tool" });
  expect(
    await update.evaluate(
      (button, uninstallButton) =>
        Boolean(
          button.compareDocumentPosition(uninstallButton as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await uninstall.elementHandle(),
    ),
  ).toBe(true);

  await update.click();
  await expect(page.getByRole("dialog", { name: "Update Writer Tool" })).toHaveCount(0);
  const reload = page.getByRole("status", { name: "Update complete" });
  await expect(reload).toContainText(
    "Updated to the latest version from the creator. Reload to apply updates.",
  );
  await expect(reload.getByRole("button", { name: "Reload now" })).toBeVisible();
  await expect(card.getByText("Latest")).toBeVisible();
  await expect(card.getByRole("button", { name: "Update Writer Tool" })).toHaveCount(0);
});

test("offers scanned and creator updates when installed is behind both", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "installed-update-both");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const card = page.locator(".tavernary-companion-installed-card", {
    has: page.getByRole("heading", { name: "Writer Tool" }),
  });
  await card.getByRole("button", { name: "Update Writer Tool" }).click();
  const chooser = page.getByRole("dialog", { name: "Update Writer Tool" });
  await expect(chooser.getByRole("button", { name: "Latest scanned" })).toHaveAccessibleDescription(
    "Scanned Aug 17 · older than latest.",
  );
  await expect(
    chooser.getByRole("button", { name: "Latest from creator" }),
  ).toHaveAccessibleDescription("Newer changes have not been scanned yet.");

  const scan = chooser.getByRole("button", {
    name: "TavernKeeper scan: Low concern observed; JavaScript/TypeScript scan complete; stale assessment.",
  });
  await scan.hover();
  const panel = page.getByRole("dialog", { name: "TavernKeeper Scan Results" });
  await expect(panel).toContainText("The creator has published changes since this scan.");
  await panel.dispatchEvent("pointerdown");
  await expect(chooser).toBeVisible();
  await page.keyboard.press("Escape");
  await chooser.getByRole("button", { name: "Latest from creator" }).focus();
  await scan.focus();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await scan.click();
  await expect(panel).toBeVisible();
  await scan.click();
  await expect(panel).toHaveCount(0);
  await chooser.getByRole("button", { name: "Cancel" }).click();
  await expect(chooser).toHaveCount(0);
});

test.describe("touch update choice", () => {
  test.use({ hasTouch: true });

  test("opens the scanned result by tap without dismissing the chooser", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHarness(page, "installed-update-both");
    await page.getByRole("button", { name: "Browse categories" }).click();
    await page
      .getByRole("group", { name: "Browse categories menu" })
      .getByRole("button", { name: "Installed" })
      .click();

    const card = page.locator(".tavernary-companion-installed-card", {
      has: page.getByRole("heading", { name: "Writer Tool" }),
    });
    await card.getByRole("button", { name: "Update Writer Tool" }).tap();
    const chooser = page.getByRole("dialog", { name: "Update Writer Tool" });
    const scan = chooser.getByRole("button", { name: /TavernKeeper scan:/u });
    await scan.tap();
    await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
    await expect(chooser).toBeVisible();
    await scan.tap();
    await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toHaveCount(0);
    await expect(chooser).toBeVisible();
  });
});

test("keeps the update chooser inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page, "installed-update-both");
  await page.getByRole("button", { name: "Browse categories" }).click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Installed" })
    .click();

  const card = page.locator(".tavernary-companion-installed-card", {
    has: page.getByRole("heading", { name: "Writer Tool" }),
  });
  await card.getByRole("button", { name: "Update Writer Tool" }).click();
  const chooser = page.getByRole("dialog", { name: "Update Writer Tool" });
  await expect(chooser).toBeVisible();
  const bounds = await chooser.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
});

test("uses native SillyTavern updates without showing extension attention", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "installed-native-update");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  await expect(
    page.getByText(
      "SillyTavern can update extensions to the latest version from their creator. Updating to a specific TavernKeeper-scanned version isn’t supported by this build.",
    ),
  ).toBeVisible();
  const card = page.locator(".tavernary-companion-installed-card", {
    has: page.getByRole("heading", { name: "Writer Tool" }),
  });
  await expect(card.getByText("Update available")).toBeVisible();
  await expect(card.getByText("Needs attention")).toHaveCount(0);

  await card.getByRole("button", { name: "Update Writer Tool" }).click();
  await expect(page.getByRole("dialog", { name: "Update Writer Tool" })).toHaveCount(0);

  await expect(page.getByRole("status", { name: "Update complete" })).toContainText(
    "Updated to the latest version from the creator. Reload to apply updates.",
  );
  await expect(card.getByText("Latest")).toBeVisible();
});

test("gives a disabled extension a specific actionable attention reason", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "installed-local-changes");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const card = page.locator(".tavernary-companion-installed-card", {
    has: page.getByRole("heading", { name: "Writer Tool" }),
  });
  const status = card.getByText("Needs attention");
  await expect(status).toHaveCSS("color", "rgb(248, 81, 73)");
  await expect(card).toContainText(
    "This extension has local file changes, so Companion won’t overwrite them. Review those changes, then check again.",
  );
  await expect(
    card.getByRole("button", { name: "Manage Writer Tool in SillyTavern" }),
  ).toBeVisible();
});
