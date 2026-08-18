import axe from "axe-core";
import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("has no serious or critical axe violations", async ({ page }) => {
  await openHarness(page);
  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate(async () => {
    const runtime = (window as typeof window & { axe: typeof axe }).axe;
    return runtime.run(document.querySelector(".tavernary-companion-root")!, {
      rules: { "color-contrast": { enabled: false } },
    });
  });
  expect(
    results.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
  ).toEqual([]);
});

test("filter sheet closes with Escape and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  const trigger = page.getByRole("button", { name: "Filters" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Project filters" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Project filters" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("reduced motion removes visible transforms and long transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHarness(page);
  const styles = await page.getByTestId("companion-shell").evaluate((element) => {
    const computed = getComputedStyle(element);
    return { transitionDuration: computed.transitionDuration, transform: computed.transform };
  });
  expect(Number.parseFloat(styles.transitionDuration)).toBeLessThanOrEqual(0.00001);
  expect(styles.transform).toBe("none");
});
