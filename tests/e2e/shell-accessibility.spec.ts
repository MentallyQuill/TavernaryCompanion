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
  const trigger = page.getByRole("button", { name: "Open filters" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Project filters" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Project filters" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("filter sheet traps focus, clears safely, and releases modal state on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openHarness(page);
  await page.getByRole("button", { name: "Open filters" }).click();
  const sheet = page.getByRole("dialog", { name: "Project filters" });
  const close = sheet.getByRole("button", { name: "Close filters" });
  await expect(close).toBeFocused();
  expect(
    await page
      .getByRole("button", { name: "Refresh catalog" })
      .evaluate((element) => Boolean(element.closest("[inert]"))),
  ).toBe(true);

  await page.keyboard.press("Shift+Tab");
  await expect(sheet.getByRole("checkbox", { name: "Missing license" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();

  const memory = sheet.getByRole("checkbox", { name: "Memory" });
  await sheet.getByText("Memory", { exact: true }).click();
  await expect(memory).toBeChecked();
  const clear = sheet.getByRole("button", { name: "Clear all filters" });
  await expect(clear).toBeEnabled();
  await clear.click();
  await expect(close).toBeFocused();
  await expect(memory).not.toBeChecked();

  await page.setViewportSize({ width: 1440, height: 960 });
  await expect(page.getByRole("dialog", { name: "Project filters" })).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-filter-surface")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open filters" })).not.toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Refresh catalog" })
      .evaluate((element) => Boolean(element.closest("[inert]"))),
  ).toBe(false);
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
