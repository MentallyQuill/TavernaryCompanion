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
    if (viewport.width <= 700) {
      await page.getByRole("combobox", { name: "Browse Companion" }).selectOption("kits");
    } else {
      await page.getByRole("tab", { name: "Kits" }).click();
    }
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
    const switcher = page.getByLabel("Active managed Kit");
    await expect(switcher).not.toHaveValue("");
    const kitId = await switcher.inputValue();
    await page.getByRole("button", { name: "Dismiss" }).click();

    await switcher.selectOption("");
    const deactivateReview = page.getByRole("dialog", { name: "Deactivate Kit review" });
    await deactivateReview.getByRole("button", { name: "Deactivate Kit" }).click();
    await expect(page.getByRole("button", { name: "Activate" })).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();

    await switcher.selectOption(kitId);
    await page
      .getByRole("dialog", { name: "Activate Kit review" })
      .getByRole("button", { name: "Activate Kit" })
      .click();
    await expect(switcher).toHaveValue(kitId);
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

test("preserves a shared extension while uninstalling one Kit", async ({ page }) => {
  await openHarness(page, "shared");
  await page.getByRole("tab", { name: "Kits" }).click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  const writer = page.locator("[data-kit-id]").filter({
    has: page.getByRole("heading", { name: "Writer's Kit", exact: true }),
  });
  await writer.getByRole("button", { name: "Details" }).click();
  await page.getByRole("button", { name: "Uninstall Kit" }).click();
  await page
    .getByRole("dialog", { name: "Uninstall Kit review" })
    .getByRole("button", { name: "Uninstall Kit" })
    .click();
  await expect(page.getByRole("heading", { name: "Kit completed" })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await page.getByRole("button", { name: "Back" }).click();

  await expect(writer).toContainText("Saved");
  await expect(writer.getByRole("button", { name: "Install Kit" })).toBeVisible();
  const shared = page.locator("[data-kit-id]").filter({ hasText: "Shared Writer Kit" });
  await expect(shared).toContainText("Installed");
  await expect(shared.getByRole("button", { name: "Activate" })).toBeVisible();
});

test("surfaces failed activation and interrupted recovery receipts", async ({ page }) => {
  await openHarness(page, "failure");
  await page.getByRole("tab", { name: "Kits" }).click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await page.getByRole("button", { name: "Activate" }).click();
  await page
    .getByRole("dialog", { name: "Activate Kit review" })
    .getByRole("button", { name: "Activate Kit" })
    .click();
  await expect(page.getByRole("heading", { name: "Kit failed" })).toBeVisible();

  await openHarness(page, "interrupted");
  await expect(page.getByRole("heading", { name: "Kit interrupted" })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await page.getByRole("tab", { name: "Kits" }).click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await expect(page.getByText("Drifted", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review" })).toBeVisible();
});

test("confirms dirty editor discard and imports a personal Kit", async ({ page }) => {
  await openHarness(page);
  await page.getByRole("tab", { name: "Kits" }).click();
  await page.getByRole("button", { name: "New Kit" }).click();
  const editor = page.getByRole("dialog", { name: "New personal Kit" });
  await editor.getByLabel("Title").fill("Unsaved Kit");
  await editor.getByRole("button", { name: "Cancel" }).click();
  const discard = page.getByRole("alertdialog", { name: "Discard Kit changes?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await editor.getByRole("button", { name: "Cancel" }).click();
  await page
    .getByRole("alertdialog", { name: "Discard Kit changes?" })
    .getByRole("button", { name: "Discard changes" })
    .click();

  await page.getByRole("button", { name: "Import" }).click();
  const imported = {
    formatVersion: 1,
    id: "018f6f42-7142-7a1f-9b52-9d3a7d548999",
    title: "Imported Kit",
    description: "Imported through the browser workflow.",
    targetFrontend: "sillytavern",
    projectIds: ["alpha", "missing-project"],
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    origin: { kind: "local" },
  };
  const importDialog = page.getByRole("dialog", { name: "Import personal Kit" });
  await importDialog.getByLabel("Kit JSON file").setInputFiles({
    name: "imported-kit.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(importDialog.getByRole("heading", { name: "Imported Kit" })).toBeVisible();
  await expect(importDialog.locator('dt:has-text("Unavailable") + dd')).toHaveText("1");
  await importDialog.getByRole("button", { name: "Import Kit" }).click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await expect(page.getByRole("heading", { name: "Imported Kit" })).toBeVisible();
});
