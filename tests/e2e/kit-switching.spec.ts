import { expect, test } from "@playwright/test";
import { openHarness } from "./harness";

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`keeps personal Kit actions reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openHarness(page);
    await page.getByRole("tab", { name: "Kits" }).click();
    await page.getByRole("tab", { name: /Personal/u }).click();
    await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activate" })).toBeVisible();
    await page.getByRole("button", { name: "Details" }).click();
    await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Uninstall Kit" })).toBeVisible();
  });
}
