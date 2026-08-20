import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

async function openInstalled(page: Parameters<typeof openHarness>[0], scenario?: string) {
  await openHarness(page, scenario);
  if ((page.viewportSize()?.width ?? 1440) <= 760) {
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
}

const selectedCount = (page: Parameters<typeof openHarness>[0]) =>
  page.getByRole("complementary", { name: "Bulk actions" }).getByRole("status");

test("selects installed Kit members, deduplicates overlap, and clears the mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openInstalled(page, "shared");

  await page
    .getByRole("button", { name: "Select 1 installed extension from Writer's Kit" })
    .click();
  await expect(selectedCount(page)).toHaveText("1 selected");
  await expect(page.locator(".tavernary-companion-installed-card.is-selected")).toHaveCount(1);
  await expect(page.locator(".tavernary-companion-installed-kit-card.is-selected")).toHaveCount(1);

  await page
    .getByRole("button", { name: "Select 1 installed extension from Shared Writer Kit" })
    .click();
  await expect(selectedCount(page)).toHaveText("1 selected");
  await expect(page.locator(".tavernary-companion-installed-kit-card.is-selected")).toHaveCount(2);

  await page.getByRole("checkbox", { name: "Select Writer Tool" }).click();
  await expect(selectedCount(page)).toHaveText("0 selected");
  await expect(page.locator(".tavernary-companion-installed-kit-card.is-selected")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Select Writer Tool" }).click();
  await expect(selectedCount(page)).toHaveText("1 selected");
  await expect(page.locator(".tavernary-companion-installed-kit-card.is-selected")).toHaveCount(0);

  await page.getByRole("button", { name: "Clear selection and exit" }).click();
  await expect(page.getByRole("button", { name: "Select installed extensions" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Bulk actions" })).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-installed-card.is-selected")).toHaveCount(0);
});

test("supports keyboard selection and preserves selection when Add to Kit is canceled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openInstalled(page);

  const selectMode = page.getByRole("button", { name: "Select installed extensions" });
  await selectMode.focus();
  await page.keyboard.press("Enter");
  const extension = page.getByRole("checkbox", { name: "Select Writer Tool" });
  await extension.focus();
  await page.keyboard.press("Space");
  await expect(selectedCount(page)).toHaveText("1 selected");

  await page.getByRole("button", { name: "Add selected extensions to a Kit" }).click();
  await expect(page.getByRole("dialog", { name: "Add 1 extension to a Kit" })).toBeVisible();
  await expect(
    page.getByText("Adding to a Kit does not change extension ownership."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(selectedCount(page)).toHaveText("1 selected");

  await page.getByRole("button", { name: "Add selected extensions to a Kit" }).click();
  await page.getByRole("button", { name: "Add to Writer's Kit" }).click();
  const builder = page.getByRole("complementary", { name: "Kit Builder" });
  await expect(builder).toBeVisible();
  await builder.getByRole("button", { name: "Save Kit" }).click();
  await expect(page.getByRole("complementary", { name: "Bulk actions" })).toHaveCount(0);
});

test("reviews, verifies, and records a bulk uninstall while preserving Kit intent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openInstalled(page);

  await page.getByRole("button", { name: /Select 1 installed extension from/u }).click();
  await page.getByRole("button", { name: "Uninstall selected extensions" }).click();
  const review = page.getByRole("dialog", { name: "Uninstall 1 extension" });
  await expect(review.getByText("Writer's Kit will become Missing.")).toBeVisible();
  await review.getByRole("button", { name: "Uninstall 1" }).click();

  await expect(page.getByRole("status", { name: "Bulk uninstall result" })).toContainText(
    "Writer Tool — Removed",
  );
  await expect(page.locator(".tavernary-companion-installed-card")).toHaveCount(0);
  await expect(page.getByText("0/1 installed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Missing Kit status help" })).toBeVisible();
});

test("keeps status help and the sticky bulk bar usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openInstalled(page);

  await page.getByRole("button", { name: "Kit status help" }).click();
  await expect(
    page.getByText("Some extensions in this Kit are not currently installed."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kit status help" }).click();
  await page.getByRole("button", { name: /Select 1 installed extension from/u }).click();

  const bulkBar = page.getByRole("complementary", { name: "Bulk actions" });
  const [barBox, rootBox] = await Promise.all([
    bulkBar.boundingBox(),
    page.locator(".tavernary-companion-root").boundingBox(),
  ]);
  expect(barBox).not.toBeNull();
  expect(rootBox).not.toBeNull();
  expect(barBox!.x).toBeGreaterThanOrEqual(rootBox!.x);
  expect(barBox!.x + barBox!.width).toBeLessThanOrEqual(rootBox!.x + rootBox!.width);
  await expect(page.getByRole("button", { name: "Clear selection and exit" })).toHaveCSS(
    "min-height",
    "44px",
  );
});
