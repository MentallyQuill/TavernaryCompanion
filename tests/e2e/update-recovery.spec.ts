import { expect, test } from "@playwright/test";
import { openHarness } from "./harness";

for (const width of [1440, 390]) {
  test(`local-change recovery and Update All at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await openHarness(page, "installed-replacement");
    if (width < 600) {
      await page.getByRole("button", { name: "Browse categories" }).click();
      await page
        .getByRole("group", { name: "Browse categories menu" })
        .getByRole("button", { name: "Installed" })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "Catalog categories" })
        .getByRole("button", { name: "Installed" })
        .click();
    }
    await page.getByRole("button", { name: "Update All (1)" }).click();
    const prompt = page.getByRole("alert").filter({ hasText: "couldn’t update." });
    await expect(prompt).toContainText("Writer Tool couldn’t update.");
    await expect(prompt).toContainText(
      "Do you want to force-update? This will remove its current files and reinstall the version you selected.",
    );
    const rect = await prompt.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `artifacts/update-recovery-${width}.png` });
    await prompt.getByRole("button", { name: "Cancel" }).click();
    await expect(prompt).toHaveCount(0);
    await page.getByRole("button", { name: "Update All (1)" }).click();
    await prompt.getByRole("button", { name: "Replace and update" }).click();
    await expect(page.getByRole("status", { name: "Update complete" })).toBeVisible();
  });
}
