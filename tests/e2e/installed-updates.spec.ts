import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("checks, confirms, and applies an Installed extension update", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "installed-update");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const card = page.locator(".tavernary-companion-installed-card", {
    has: page.getByRole("heading", { name: "Writer Tool" }),
  });
  await expect(card.getByText("Update available")).toBeVisible();
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
  const chooser = page.getByRole("dialog", { name: "Update Writer Tool" });
  await expect(chooser).toContainText("You already have the latest scanned version.");
  await expect(chooser.getByRole("button", { name: "Latest scanned version" })).toHaveCount(0);
  await expect(chooser.getByRole("button", { name: "Newest version" })).toBeVisible();
  expect(await chooser.textContent()).not.toMatch(/\b[0-9a-f]{40}\b/iu);

  await chooser.getByRole("button", { name: "Newest version" }).click();
  const reload = page.getByRole("status", { name: "Update complete" });
  await expect(reload).toContainText("Updated to the newest version. Reload to apply updates.");
  await expect(reload.getByRole("button", { name: "Reload now" })).toBeVisible();
  await expect(card.getByText("Up to date")).toBeVisible();
  await expect(card.getByRole("button", { name: "Update Writer Tool" })).toHaveCount(0);
});

test("keeps the update chooser inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page, "installed-update");
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
      "SillyTavern can update extensions to their newest version. Updating to a specific TavernKeeper-scanned version isn’t supported by this build.",
    ),
  ).toBeVisible();
  const card = page.locator(".tavernary-companion-installed-card", {
    has: page.getByRole("heading", { name: "Writer Tool" }),
  });
  await expect(card.getByText("Update available")).toBeVisible();
  await expect(card.getByText("Needs attention")).toHaveCount(0);

  await card.getByRole("button", { name: "Update Writer Tool" }).click();
  const chooser = page.getByRole("dialog", { name: "Update Writer Tool" });
  await expect(chooser.getByRole("button", { name: "Newest version" })).toBeVisible();
  await expect(chooser.getByRole("button", { name: "Latest scanned version" })).toHaveCount(0);
  await chooser.getByRole("button", { name: "Newest version" }).click();

  await expect(page.getByRole("status", { name: "Update complete" })).toContainText(
    "Updated to the newest version. Reload to apply updates.",
  );
  await expect(card.getByText("Up to date")).toBeVisible();
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
