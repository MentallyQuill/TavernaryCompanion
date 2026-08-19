import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

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
  expect(await cards.count()).toBeGreaterThanOrEqual(2);

  const enable = page.getByRole("switch", { name: /Enable /u });
  await expect(enable).toHaveAttribute("aria-checked", "false");
  const [toggleBox, trackBox, cardBox] = await Promise.all([
    enable.boundingBox(),
    enable.locator("span").boundingBox(),
    enable.locator("../..").boundingBox(),
  ]);
  expect(toggleBox).not.toBeNull();
  expect(trackBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
  expect(trackBox!.width).toBe(42);
  expect(trackBox!.height).toBe(24);
  expect(cardBox!.height).toBeLessThanOrEqual(160);
  await expect(enable.locator("b")).toHaveCSS("font-size", "11px");
  await expect(enable.locator("b")).toHaveCSS("font-weight", "700");

  await enable.click();
  const disable = page.getByRole("switch", { name: /Disable /u });
  await expect(disable).toHaveAttribute("aria-checked", "true");

  await disable.click();
  await expect(page.getByRole("switch", { name: /Enable /u })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});
