import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("Installed reports loading until initial host discovery completes", async ({ page }) => {
  await openHarness(page, "initial-loading");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  await expect(page.getByText("Loading installed extensions…", { exact: true })).toBeVisible();
  await expect(page.getByText("0 installed extensions")).toHaveCount(0);
  await expect(page.getByText("No installed extensions were found in this profile.")).toHaveCount(
    0,
  );

  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-release-inventory"));
  });
  await expect(page.getByText("1 installed extension")).toBeVisible();
  await expect(page.getByText("Loading installed extensions…")).toHaveCount(0);
});

test("Installed serializes overlapping discovery requests", async ({ page }) => {
  await openHarness(page, "overlapping-inventory");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  await expect(page.getByText("Loading installed extensions…", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-release-inventory-2"));
  });
  await expect(page.getByText("Loading installed extensions…", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-release-inventory-1"));
  });
  await expect(page.getByText("1 installed extension")).toBeVisible();
  await expect(page.getByText("No installed extensions were found in this profile.")).toHaveCount(
    0,
  );
});

test("Installed retains confirmed inventory across popup remounts", async ({ page }) => {
  await openHarness(page, "remount-inventory");
  const installed = page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" });
  await installed.click();
  await expect(page.getByText("1 installed extension")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
  await expect(page.getByText("In Writer's Kit")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Select 1 installed extension from Writer's Kit" }),
  ).toBeVisible();
  await expect(page.getByText("Updating installed extensions…")).toHaveCount(0);

  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-remount-popup"));
  });
  if ((await installed.getAttribute("aria-pressed")) !== "true") await installed.click();

  await expect(page.getByText("1 installed extension")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
  await expect(page.getByText("In Writer's Kit")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Select 1 installed extension from Writer's Kit" }),
  ).toBeVisible();
  await expect(page.getByText("Updating installed extensions…")).toBeVisible();
  await expect(page.getByText("Loading installed extensions…")).toHaveCount(0);

  await page.evaluate(() => {
    window.dispatchEvent(new Event("tavernary-test-release-remount-inventory"));
  });
  await expect(page.getByText("Updating installed extensions…")).toHaveCount(0);
  await expect(page.getByText("1 installed extension")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
  await expect(page.getByText("In Writer's Kit")).toBeVisible();
});

test("Installed uses four desktop columns when its content width permits them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const grid = page.locator(".tavernary-companion-installed-grid").first();
  const columns = await grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u),
  );
  expect(columns).toHaveLength(4);
  expect(await grid.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test("Installed clips extension names that exceed their card width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHarness(page, "installed-long-name");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const title = page.getByRole("heading", {
    name: "SillyTavern Extension With An Intentionally Long Installed Name",
  });
  await expect(title).toHaveCSS("overflow", "hidden");
  await expect(title).toHaveCSS("text-overflow", "ellipsis");
  await expect(title).toHaveCSS("white-space", "nowrap");
  expect(
    await title.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
  ).toMatchObject({ clientWidth: expect.any(Number), scrollWidth: expect.any(Number) });
  expect(await title.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});

test("Installed groups Kits and lets extensions be enabled and restored from cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  await expect(page.getByRole("heading", { name: "Installed Kits" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Writer's Kit" })).toBeVisible();
  await expect(page.getByText("In Writer's Kit")).toBeVisible();
  const cards = page.locator(".tavernary-companion-installed-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
  const kitCards = page.locator(".tavernary-companion-installed-kit-card");
  await expect(kitCards).toHaveCount(1);
  const [kitCardBox, installedCardBox] = await Promise.all([
    kitCards.first().boundingBox(),
    cards.first().boundingBox(),
  ]);
  expect(kitCardBox).not.toBeNull();
  expect(installedCardBox).not.toBeNull();
  expect(kitCardBox!.width).toBeLessThanOrEqual(installedCardBox!.width);

  const enable = page.getByRole("switch", { name: /Enable /u });
  await expect(enable).toHaveAttribute("aria-checked", "false");
  const versionStatus = enable.locator("../..").locator(":scope > header > strong");
  await expect(versionStatus).toHaveText("Latest");
  await expect(versionStatus).not.toHaveText(/Enabled|Disabled/u);
  await expect(enable.locator("../..").locator(":scope > header > h4")).toHaveText("Writer Tool");
  await expect(enable.locator("../..").locator(":scope > header > h4")).toHaveCSS(
    "text-transform",
    "none",
  );
  await expect(enable.locator("../..").locator(":scope > header > h4")).toHaveCSS(
    "letter-spacing",
    "normal",
  );
  await expect(enable.locator("../..").getByText("Companion managed")).toHaveCount(0);
  await expect(enable.locator("b")).toHaveText("Disabled");
  const [toggleBox, trackBox, thumbBox, cardBox] = await Promise.all([
    enable.boundingBox(),
    enable.locator("span").boundingBox(),
    enable.locator("i").boundingBox(),
    enable.locator("../..").boundingBox(),
  ]);
  expect(toggleBox).not.toBeNull();
  expect(trackBox).not.toBeNull();
  expect(thumbBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
  expect(trackBox!.width).toBe(34);
  expect(trackBox!.height).toBe(20);
  expect(thumbBox!.width).toBe(13);
  expect(thumbBox!.height).toBe(13);
  await expect(enable.locator("span")).toHaveCSS("border-radius", "6px");
  await expect(enable.locator("i")).toHaveCSS("border-radius", "3px");
  expect(cardBox!.height).toBeLessThanOrEqual(145);
  await expect(enable.locator("b")).toHaveCSS("font-size", "11px");
  await expect(enable.locator("b")).toHaveCSS("font-weight", "700");

  const installedCard = enable.locator("../..");
  const installedCardStyle = await installedCard.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderWidths: [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ],
      boxShadow: style.boxShadow,
    };
  });
  expect(new Set(installedCardStyle.borderWidths).size).toBe(1);
  expect(installedCardStyle.boxShadow).not.toContain("inset");

  const kitMenu = page.getByRole("button", { name: "More actions for Writer's Kit" });
  await expect(kitMenu).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(kitMenu).toHaveCSS("border-top-width", "0px");
  await expect(kitMenu).toHaveCSS("font-size", "11px");
  const [kitCardBounds, kitMenuBounds] = await Promise.all([
    kitCards.first().boundingBox(),
    kitMenu.boundingBox(),
  ]);
  expect(kitCardBounds).not.toBeNull();
  expect(kitMenuBounds).not.toBeNull();
  expect(
    Math.abs(kitCardBounds!.x + kitCardBounds!.width - 3 - (kitMenuBounds!.x + 44)),
  ).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const installedLifecycle = page
    .locator(".tavernary-companion-installed-card .tavernary-companion-project-lifecycle")
    .first();
  const [mobileLifecycleBounds, mobileLifecycleFaceBounds] = await Promise.all([
    installedLifecycle.boundingBox(),
    installedLifecycle.locator(".tavernary-companion-project-lifecycle__face").boundingBox(),
  ]);
  expect(mobileLifecycleBounds).not.toBeNull();
  expect(mobileLifecycleFaceBounds).not.toBeNull();
  expect(mobileLifecycleBounds!.width).toBeGreaterThanOrEqual(44);
  expect(mobileLifecycleBounds!.height).toBeGreaterThanOrEqual(44);
  expect(mobileLifecycleFaceBounds!.width).toBe(34);
  expect(mobileLifecycleFaceBounds!.height).toBe(34);

  await enable.click();
  const disable = page.getByRole("switch", { name: /Disable /u });
  await expect(disable).toHaveAttribute("aria-checked", "true");

  await disable.click();
  await expect(page.getByRole("switch", { name: /Enable /u })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});
