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
  await expect(reload).toContainText("Writer Tool updated. Reload to apply updates.");
  await expect(reload.getByRole("button", { name: "Reload now" })).toBeVisible();
  await expect(card.getByText("Up to date")).toBeVisible();
  await expect(card.getByRole("button", { name: "Update Writer Tool" })).toHaveCount(0);
});
