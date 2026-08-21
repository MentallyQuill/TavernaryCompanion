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

  const writerCard = page
    .locator(".tavernary-companion-installed-card")
    .filter({ hasText: "Writer Tool" });
  await writerCard.locator(".tavernary-companion-installed-memberships").click();
  await expect(page.getByRole("complementary", { name: "Bulk actions" })).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-installed-kit-card.is-selected")).toHaveCount(0);
  await writerCard.locator(".tavernary-companion-installed-memberships").click();
  await expect(selectedCount(page)).toHaveText("1 selected");
  await expect(page.locator(".tavernary-companion-installed-kit-card.is-selected")).toHaveCount(0);

  await page.getByRole("button", { name: "Clear selection and exit" }).click();
  await expect(page.getByRole("button", { name: "Select installed extensions" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Bulk actions" })).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-installed-card.is-selected")).toHaveCount(0);
});

test("uses the yellow-orange selection border without shifting the lifecycle action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openInstalled(page);

  const card = page
    .locator(".tavernary-companion-installed-card")
    .filter({ hasText: "Writer Tool" });
  await expect(card.getByRole("checkbox")).toHaveCount(0);
  await card.locator(".tavernary-companion-installed-memberships").click();
  await expect(card.getByRole("button", { name: "Deselect Writer Tool" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const [borderColor, themeColor] = await card.evaluate((element) => {
    const root = element.closest(".tavernary-companion-root")!;
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(root)
      .getPropertyValue("--tavernary-color-functional")
      .trim();
    root.append(probe);
    const colors = [getComputedStyle(element).borderTopColor, getComputedStyle(probe).color];
    probe.remove();
    return colors;
  });
  expect(borderColor).toBe(themeColor);

  const [cardBox, actionBox] = await Promise.all([
    card.boundingBox(),
    card.getByRole("button", { name: "Uninstall Writer Tool" }).boundingBox(),
  ]);
  expect(cardBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(cardBox!.x + cardBox!.width - (actionBox!.x + actionBox!.width)).toBeLessThanOrEqual(18);
  expect(cardBox!.y + cardBox!.height - (actionBox!.y + actionBox!.height)).toBeLessThanOrEqual(18);
  expect(actionBox!.width).toBe(34);
  expect(actionBox!.height).toBe(34);

  const face = card.locator(".tavernary-companion-project-lifecycle__face");
  const bulkUninstall = page.getByRole("button", { name: "Uninstall selected extensions" });
  const [faceTheme, bulkTheme] = await Promise.all(
    [face, bulkUninstall].map((control) =>
      control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          border: style.borderTopColor,
          color: style.color,
        };
      }),
    ),
  );
  expect(faceTheme).toEqual(bulkTheme);
});

test("centers the bulk bar in the Installed panel for both Kit Builder widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openInstalled(page);
  await page.getByRole("button", { name: /Select 1 installed extension from/u }).click();

  const centerDelta = async () => {
    const [route, bulk] = await Promise.all([
      page.locator(".tavernary-companion-installed-route").boundingBox(),
      page.getByRole("complementary", { name: "Bulk actions" }).boundingBox(),
    ]);
    expect(route).not.toBeNull();
    expect(bulk).not.toBeNull();
    return bulk!.x + bulk!.width / 2 - (route!.x + route!.width / 2);
  };

  expect(Math.abs(await centerDelta())).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Open Kit Builder" }).click();
  await expect(page.getByRole("button", { name: "Collapse Kit Builder" })).toBeVisible();
  await expect.poll(async () => Math.abs(await centerDelta())).toBeLessThanOrEqual(1);
});

test("keeps catalog card content visible beneath the full-card selection control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openInstalled(page);

  const card = page
    .locator(".tavernary-companion-installed-card")
    .filter({ hasText: "Writer Tool" });
  await card.locator(".tavernary-companion-installed-memberships").click();

  await expect(card.getByRole("heading", { name: "Writer Tool" })).toBeVisible();
  await expect(card.locator(":scope > .tavernary-companion-installed-card__select")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
});

test("supports direct card and keyboard selection and preserves selection when Add to Kit is canceled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openInstalled(page);

  await expect(page.getByRole("button", { name: "Select installed extensions" })).toHaveCount(0);
  const card = page
    .locator(".tavernary-companion-installed-card")
    .filter({ hasText: "Writer Tool" });
  await card.locator(".tavernary-companion-installed-memberships").click();
  await expect(selectedCount(page)).toHaveText("1 selected");

  const extension = page.getByRole("button", { name: "Deselect Writer Tool" });
  await extension.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("complementary", { name: "Bulk actions" })).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(selectedCount(page)).toHaveText("1 selected");

  const addToKit = page.getByRole("button", { name: "Add selected extensions to a Kit" });
  await expect(addToKit).toHaveClass(/tavernary-companion-kit-selection-add/u);
  await expect(addToKit.locator(".selection-count")).toHaveText("1");
  await addToKit.click();
  await expect(page.getByRole("dialog", { name: "Add 1 extension to a Kit" })).toBeVisible();
  await expect(
    page.getByText("Adding to a Kit does not change extension ownership."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(selectedCount(page)).toHaveText("1 selected");

  await addToKit.click();
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
