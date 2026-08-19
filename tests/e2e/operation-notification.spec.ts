import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("verified install floats outside and above the Companion panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "success-receipt");

  const notification = page.getByRole("status", { name: "Installation complete" });
  await expect(notification).toBeVisible();
  await expect(notification).toContainText("Alpha installed");
  await expect(notification).toContainText(
    "Verified in SillyTavern · Reload to finish installation",
  );
  expect(await notification.evaluate((element) => element.parentElement === document.body)).toBe(
    true,
  );

  const panel = await page.locator(".tavernary-companion-root").boundingBox();
  const notice = await notification.boundingBox();
  expect(panel).not.toBeNull();
  expect(notice).not.toBeNull();
  expect(notice!.y + notice!.height).toBeLessThanOrEqual(panel!.y);
  expect(notice!.x + notice!.width / 2).toBeCloseTo(panel!.x + panel!.width / 2, 0);

  const styles = await notification.evaluate((element) => {
    const button = element.querySelector("button")!;
    const noticeStyles = getComputedStyle(element);
    const buttonStyles = getComputedStyle(button);
    return {
      font: noticeStyles.fontFamily,
      background: buttonStyles.backgroundColor,
      borderStart: buttonStyles.borderInlineStartColor,
      radius: buttonStyles.borderRadius,
      position: noticeStyles.position,
    };
  });
  expect(styles).toEqual({
    font: expect.stringContaining("Inter Variable"),
    background: "rgb(28, 40, 46)",
    borderStart: "rgb(45, 212, 191)",
    radius: "8px",
    position: "fixed",
  });
  const dismiss = notification.getByRole("button", {
    name: "Dismiss notification: Alpha installed. Verified in SillyTavern · Reload to finish installation",
  });
  await dismiss.dispatchEvent("pointerenter");
  await expect(notification).toHaveScreenshot("operation-notification-1440.png", {
    maxDiffPixelRatio: 0.04,
  });

  await dismiss.click();
  await expect(notification).toHaveCount(0);
});

test("verified install notification remains a contained top layer on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page, "success-receipt");

  const notification = page.getByRole("status", { name: "Installation complete" });
  await expect(notification).toBeVisible();
  const panel = await page.locator(".tavernary-companion-root").boundingBox();
  const notice = await notification.boundingBox();
  expect(panel).not.toBeNull();
  expect(notice).not.toBeNull();
  expect(notice!.x).toBeGreaterThanOrEqual(8);
  expect(notice!.x + notice!.width).toBeLessThanOrEqual(382);
  expect(notice!.y).toBeGreaterThanOrEqual(8);
  expect(notice!.y + notice!.height).toBeLessThanOrEqual(panel!.y);
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(844);
  expect(await notification.evaluate((element) => element.parentElement === document.body)).toBe(
    true,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await notification
    .getByRole("button", {
      name: "Dismiss notification: Alpha installed. Verified in SillyTavern · Reload to finish installation",
    })
    .dispatchEvent("pointerenter");
  await expect(notification).toHaveScreenshot("operation-notification-390.png", {
    maxDiffPixelRatio: 0.04,
  });
  await expect(page).toHaveScreenshot("operation-notification-panel-390x844.png");
});
