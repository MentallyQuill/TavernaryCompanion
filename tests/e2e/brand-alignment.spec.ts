import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("shell uses Tavernary's production brand lockup and visual tokens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);

  await expect(page.getByRole("img", { name: "Tavernary" })).toBeVisible();
  await expect(page.getByText("Where AI roleplay tools gather")).toBeVisible();
  await expect(page.getByText("Companion", { exact: true })).toBeVisible();
  await expect(
    page.locator(".tavernary-companion-shell__header").getByRole("searchbox", {
      name: "Search projects",
    }),
  ).toBeVisible();
  await expect(page.getByRole("tablist")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Browse Companion" })).not.toBeVisible();

  const tokens = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".tavernary-companion-root")!;
    const header = document.querySelector<HTMLElement>(".tavernary-companion-shell__header")!;
    const tabs = document.querySelector<HTMLElement>(".tavernary-companion-shell__tabs")!;
    const activeTab = document.querySelector<HTMLElement>(
      '.tavernary-companion-shell__tabs [aria-selected="true"]',
    )!;
    const styles = getComputedStyle(root);
    return {
      canvas: getComputedStyle(root).backgroundColor,
      header: getComputedStyle(header).backgroundColor,
      navigation: getComputedStyle(tabs).backgroundColor,
      active: getComputedStyle(activeTab).color,
      font: styles.fontFamily,
      focus: styles.getPropertyValue("--tavernary-color-focus-ring").trim(),
      primary: styles.getPropertyValue("--tavernary-color-action-primary-bg").trim(),
    };
  });

  expect(tokens).toEqual({
    canvas: "rgb(13, 17, 23)",
    header: "rgb(16, 24, 32)",
    navigation: "rgb(18, 26, 31)",
    active: "rgb(45, 212, 191)",
    font: expect.stringContaining("Inter Variable"),
    focus: "#5eead4",
    primary: "#e18a24",
  });
});

test("mobile brand header stays contained and readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await page.locator("#app").evaluate((app) => {
    app.style.width = "310px";
  });

  const shell = await page.getByTestId("companion-shell").boundingBox();
  const brand = await page.locator(".tavernary-companion-brand").boundingBox();
  const qualifier = await page.locator(".tavernary-companion-brand__qualifier").boundingBox();
  const utilities = await page.locator(".tavernary-companion-shell__utilities").boundingBox();
  expect(shell).not.toBeNull();
  expect(brand).not.toBeNull();
  expect(qualifier).not.toBeNull();
  expect(utilities).not.toBeNull();
  expect(shell!.x).toBeGreaterThanOrEqual(0);
  expect(shell!.x + shell!.width).toBeLessThanOrEqual(390);
  expect(brand!.x + brand!.width).toBeLessThanOrEqual(shell!.x + shell!.width);
  expect(brand!.x + brand!.width).toBeLessThanOrEqual(utilities!.x);
  expect(qualifier!.x + qualifier!.width).toBeLessThanOrEqual(utilities!.x);
  await expect(page.getByText("Where AI roleplay tools gather")).toBeVisible();
  await expect(
    page.locator(".tavernary-companion-shell__header").getByRole("searchbox", {
      name: "Search projects",
    }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Browse Companion" })).toBeVisible();
  await expect(page.getByRole("tablist")).not.toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByRole("img", { name: "Tavernary" })).toBeInViewport();
  await page.getByRole("button", { name: "Close filters" }).click();
  await page.getByRole("combobox", { name: "Browse Companion" }).selectOption("kits");
  await expect(page.getByRole("img", { name: "Tavernary" })).toBeInViewport();
  await expect(page.getByRole("combobox", { name: "Browse Companion" })).toHaveValue("kits");
  await expect(page.getByRole("button", { name: "Kit filters" })).toBeVisible();
  await expect(page.locator(".tavernary-companion-kit-filters")).not.toBeVisible();
  await expect(
    page
      .locator(".tavernary-companion-kit-card, .tavernary-companion-kits-route > p:last-child")
      .first(),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Kit filters" }).click();
  await expect(page.locator(".tavernary-companion-kit-filters")).toBeVisible();
});

test("project cards use Tavernary's surface, evidence hierarchy, and action color", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await expect(page.locator(".tavernary-companion-kit-card")).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-installed-section")).toHaveCount(0);
  const card = page.locator(".tavernary-companion-project-card").first();
  const primary = card.getByTestId("project-primary-action");
  const styles = await card.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      border: computed.borderTopColor,
      radius: computed.borderRadius,
      shadow: computed.boxShadow,
    };
  });
  expect(styles).toEqual({
    background: "rgb(24, 34, 40)",
    border: "rgb(43, 58, 64)",
    radius: "8px",
    shadow: "rgba(0, 0, 0, 0.24) 0px 1px 2px 0px, rgba(0, 0, 0, 0.12) 0px 4px 12px 0px",
  });
  await expect(card.locator(".tavernary-companion-activity-strip i")).toHaveCount(12);
  await expect(card.locator(".tavernary-companion-activity-summary")).toHaveCSS("display", "flex");
  await expect(primary).toHaveCSS("background-color", "rgb(225, 138, 36)");
  const primaryBox = await primary.boundingBox();
  expect(primaryBox).not.toBeNull();
  expect(Math.abs(primaryBox!.width - primaryBox!.height)).toBeLessThanOrEqual(1);
  expect(primaryBox!.height).toBeGreaterThanOrEqual(36);
  expect(primaryBox!.height).toBeLessThanOrEqual(40);
});

test("Kits and Installed reuse the Tavernary card and control system", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page.getByRole("tab", { name: "Kits" }).click();
  await expect(page.getByRole("button", { name: "Kit filters" })).not.toBeVisible();
  await expect(page.locator(".tavernary-companion-kit-filters")).toBeVisible();
  await page.getByRole("tab", { name: /Personal/ }).click();
  const kit = page.locator(".tavernary-companion-kit-card").first();
  await expect(kit).toHaveCSS("background-color", "rgb(24, 34, 40)");
  await expect(kit).toHaveCSS("border-radius", "8px");
  await expect(kit.locator(".tavernary-companion-kit-card__primary")).toHaveCSS(
    "background-color",
    "rgb(225, 138, 36)",
  );

  await page.getByRole("tab", { name: "Installed" }).click();
  await expect(page.locator(".tavernary-companion-project-card")).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-installed-section")).toHaveCount(1);
  await expect(page.locator(".tavernary-companion-installed-section")).toHaveCSS(
    "background-color",
    "rgb(24, 34, 40)",
  );
});
