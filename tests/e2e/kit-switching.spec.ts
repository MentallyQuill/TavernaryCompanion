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
      await page.getByRole("button", { name: "Browse categories" }).click();
      await page
        .getByRole("group", { name: "Browse categories menu" })
        .getByRole("button", { name: "Kits" })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "Catalog categories" })
        .getByRole("button", { name: "Kits" })
        .click();
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
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .locator('[data-project-id="alpha"]')
    .getByRole("button", { name: "Add Alpha to Kit" })
    .click();
  const dock = page.getByRole("region", { name: "1 project selected" });
  await expect(dock.getByRole("button", { name: "Add 1 project to Kit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Kit" })).toHaveCount(0);
  await dock.getByRole("button", { name: "Add 1 project to Kit" }).click();
  await expect(page.getByRole("dialog", { name: "New personal Kit" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open Kit Builder" }).click();
  const editor = page.getByRole("complementary", { name: "Kit Builder" });
  await expect(editor.getByText("Alpha")).toBeVisible();
  await expect(editor.getByRole("heading", { name: "Add extensions" })).toHaveCount(0);
  await expect(editor.getByRole("heading", { name: "Extensions & Presets" })).toBeVisible();
  const shellBox = await page.getByTestId("companion-shell").boundingBox();
  const mainBox = await page.locator(".tavernary-companion-shell__content").boundingBox();
  const editorBox = await editor.boundingBox();
  expect(shellBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(editorBox).not.toBeNull();
  expect(editorBox!.width).toBeGreaterThanOrEqual(280);
  expect(editorBox!.width).toBeLessThanOrEqual(340);
  expect(editorBox!.x + editorBox!.width).toBeCloseTo(shellBox!.x + shellBox!.width, 0);
  expect(mainBox!.x + mainBox!.width).toBeLessThanOrEqual(editorBox!.x + 1);
  await expect(page).toHaveScreenshot("kit-builder-desktop-1440x960.png");
  await editor.getByLabel("Title").fill("Quick Kit");
  await editor.getByRole("button", { name: "Save Kit" }).click();

  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await expect(page.getByRole("heading", { name: "Quick Kit" })).toBeVisible();
  const quick = page.locator("[data-kit-id]").filter({ hasText: "Quick Kit" });
  await quick.getByRole("button", { name: "Details" }).click();
  await page.getByRole("button", { name: "Remove saved Kit" }).click();
  await expect(page.getByRole("heading", { name: "Quick Kit" })).not.toBeVisible();
});

test("uses Tavernary's full-screen Kit Builder sheet on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await page
    .locator('[data-project-id="alpha"]')
    .getByRole("button", { name: "Add Alpha to Kit" })
    .click();
  await page
    .getByRole("region", { name: "1 project selected" })
    .getByRole("button", { name: "Add 1 project to Kit" })
    .click();
  const draftPill = page.getByRole("button", { name: "Open Kit Builder" });
  await expect(draftPill).toContainText("Kit draft");
  await expect(draftPill).toContainText("1 project");
  await expect(page).toHaveScreenshot("kit-draft-pill-mobile-390x844.png");
  await draftPill.click();

  const builder = page.getByRole("dialog", { name: "Kit Builder" });
  const rootBox = await page.getByTestId("companion-shell").boundingBox();
  const builderBox = await builder.boundingBox();
  expect(rootBox).not.toBeNull();
  expect(builderBox).not.toBeNull();
  expect(builderBox!.width).toBeCloseTo(rootBox!.width, 0);
  expect(builderBox!.height).toBeCloseTo(rootBox!.height, 0);
  await expect(builder.getByRole("button", { name: "Close Kit Builder" })).toBeVisible();
  await expect(builder.getByText("Alpha")).toBeVisible();
  await expect(builder.getByRole("heading", { name: "Extensions & Presets" })).toBeVisible();
  await expect(builder.getByRole("heading", { name: "Add extensions" })).toHaveCount(0);
  await expect(builder.getByRole("button", { name: "Save Kit" })).toHaveCSS("min-height", "44px");
  await expect(page.locator(".tavernary-companion-shell__content")).toHaveAttribute("inert", "");
  await expect(page).toHaveScreenshot("kit-builder-mobile-390x844.png");
  await page.keyboard.press("Escape");
  await expect(builder).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open Kit Builder" })).toBeVisible();
});

test("reorders Kit members from Tavernary's drag handles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .locator('[data-project-id="alpha"]')
    .getByRole("button", { name: "Add Alpha to Kit" })
    .click();
  await page
    .locator('[data-project-id="project-10"]')
    .getByRole("button", { name: "Add Project 10 to Kit" })
    .click();
  await page
    .getByRole("region", { name: "2 projects selected" })
    .getByRole("button", { name: "Add 2 projects to Kit" })
    .click();
  await page.getByRole("button", { name: "Open Kit Builder" }).click();

  const builder = page.getByRole("complementary", { name: "Kit Builder" });
  const rows = builder.locator(".tavernary-companion-kit-builder-row");
  await expect(rows.nth(0)).toHaveAttribute("data-project-id", "alpha");
  await expect(rows.nth(1)).toHaveAttribute("data-project-id", "project-10");
  const source = await builder.getByRole("button", { name: "Drag Alpha to reorder" }).boundingBox();
  const target = await builder
    .getByRole("button", { name: "Drag Project 10 to reorder" })
    .boundingBox();
  expect(source).not.toBeNull();
  expect(target).not.toBeNull();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, {
    steps: 6,
  });
  await page.mouse.up();

  await expect(rows.nth(0)).toHaveAttribute("data-project-id", "project-10");
  await expect(rows.nth(1)).toHaveAttribute("data-project-id", "alpha");
});

test("preserves a shared extension while uninstalling one Kit", async ({ page }) => {
  await openHarness(page, "shared");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Kits" })
    .click();
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
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Kits" })
    .click();
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
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await expect(page.getByText("Drifted", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review" })).toBeVisible();
});

test("confirms Kit Builder draft discard and imports a personal Kit", async ({ page }) => {
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("button", { name: "New Kit" }).click();
  const editor = page.getByRole("complementary", { name: "Kit Builder" });
  await editor.getByLabel("Title").fill("Unsaved Kit");
  await editor.getByRole("button", { name: "Discard draft" }).click();
  const discard = page.getByRole("alertdialog", { name: "Discard Kit changes?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await editor.getByRole("button", { name: "Discard draft" }).click();
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
