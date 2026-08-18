import { expect, test } from "@playwright/test";
import { openHarness } from "./harness";

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`switches and edits personal Kits at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openHarness(page);
    await page.getByRole("tab", { name: "Kits" }).click();
    await page.getByRole("tab", { name: /Personal/u }).click();
    await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activate" })).toBeVisible();
    await page.getByRole("button", { name: "Activate" }).click();
    const activateReview = page.getByRole("dialog", { name: "Activate Kit review" });
    await expect(
      activateReview.getByRole("heading", { name: "Review activate changes" }),
    ).toBeVisible();
    await activateReview.getByRole("button", { name: "Activate Kit" }).click();
    await expect(page.getByRole("button", { name: "Deactivate" })).toBeVisible();
    await expect(page.getByLabel("Active managed Kit")).not.toHaveValue("");
    await page.getByRole("button", { name: "Dismiss" }).click();

    await page.getByRole("button", { name: "Deactivate" }).click();
    const deactivateReview = page.getByRole("dialog", { name: "Deactivate Kit review" });
    await deactivateReview.getByRole("button", { name: "Deactivate Kit" }).click();
    await expect(page.getByRole("button", { name: "Activate" })).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();

    await page.getByRole("button", { name: "Details" }).click();
    await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Uninstall Kit" })).toBeVisible();
    await page.getByRole("button", { name: "Duplicate" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Writer's Kit copy" })).toBeVisible();
  });
}

test("builds and removes a personal Kit from project-card selection", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("button", { name: "Select for Kit" }).click();
  await page
    .locator('[data-project-id="alpha"]')
    .getByRole("button", { name: "Add to Kit" })
    .click();
  await expect(page.getByText("1 selected")).toBeVisible();
  await page.getByRole("button", { name: "Review Kit" }).click();
  const editor = page.getByRole("dialog", { name: "New personal Kit" });
  await expect(editor.getByText("Alpha")).toBeVisible();
  await editor.getByLabel("Title").fill("Quick Kit");
  await editor.getByRole("button", { name: "Save Kit" }).click();

  await page.getByRole("tab", { name: "Kits" }).click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await expect(page.getByRole("heading", { name: "Quick Kit" })).toBeVisible();
  const quick = page.locator("[data-kit-id]").filter({ hasText: "Quick Kit" });
  await quick.getByRole("button", { name: "Details" }).click();
  await page.getByRole("button", { name: "Remove saved Kit" }).click();
  await expect(page.getByRole("heading", { name: "Quick Kit" })).not.toBeVisible();
});
