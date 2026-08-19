import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("launcher typography matches native SillyTavern controls", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 720 });
  await openHarness(page, "launcher");

  const typography = await page.evaluate(() => {
    const companion = document.querySelector<HTMLElement>("[data-tavernary-companion-label]")!;
    const native = document.querySelector<HTMLElement>("#extensions_details span")!;
    const values = (element: HTMLElement) => {
      const styles = getComputedStyle(element);
      return {
        family: styles.fontFamily,
        size: styles.fontSize,
        style: styles.fontStyle,
        weight: styles.fontWeight,
      };
    };
    return { companion: values(companion), native: values(native) };
  });

  expect(typography.companion).toEqual(typography.native);
});

test("launcher preserves the Tavernary icon colors", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 720 });
  await openHarness(page, "launcher");

  const launcher = page.getByRole("button", { name: "Tavernary Companion" });
  await expect(launcher).toHaveCSS("filter", "none");
  await expect(launcher.locator("[data-tavernary-companion-icon]")).toBeVisible();
});
