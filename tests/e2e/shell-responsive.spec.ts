import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

const viewports = [
  { width: 1440, height: 960, expectedWidth: 1325, expectedHeight: 864 },
  { width: 1366, height: 768, expectedWidth: 1257, expectedHeight: 691 },
  { width: 1024, height: 768, expectedWidth: 942, expectedHeight: 691 },
  { width: 800, height: 600, expectedWidth: 736, expectedHeight: 540 },
  { width: 412, height: 915, expectedWidth: 412, expectedHeight: 915 },
  { width: 390, height: 844, expectedWidth: 390, expectedHeight: 844 },
];

for (const viewport of viewports) {
  test(`${viewport.width}x${viewport.height} keeps shell and actions visible`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openHarness(page);
    const box = await page.getByTestId("companion-shell").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(viewport.expectedWidth - 3);
    expect(box!.width).toBeLessThanOrEqual(viewport.expectedWidth + 3);
    expect(box!.height).toBeGreaterThanOrEqual(viewport.expectedHeight - 3);
    expect(box!.height).toBeLessThanOrEqual(viewport.expectedHeight + 3);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    await expect(page.getByRole("button", { name: "Install Alpha" })).toBeVisible();
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      shell:
        document.querySelector<HTMLElement>(".tavernary-companion-root")!.scrollWidth -
        document.querySelector<HTMLElement>(".tavernary-companion-root")!.clientWidth,
    }));
    expect(overflow).toEqual({ document: 0, shell: 0 });
  });
}

test("200 percent text does not create horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await expect(page.getByRole("button", { name: "Install Alpha" })).toBeVisible();
});

test("shell is constrained by a narrower native popup content box", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page.locator("#app").evaluate((app) => {
    app.style.width = "720px";
  });
  const parent = await page.locator("#app").boundingBox();
  const shell = await page.getByTestId("companion-shell").boundingBox();
  expect(parent).not.toBeNull();
  expect(shell).not.toBeNull();
  expect(shell!.x).toBeGreaterThanOrEqual(parent!.x);
  expect(shell!.x + shell!.width).toBeLessThanOrEqual(parent!.x + parent!.width + 1);
  expect(await page.locator("#app").evaluate((app) => app.scrollWidth - app.clientWidth)).toBe(0);
});

for (const viewport of [
  { width: 1440, height: 960, minimumDesktopWidth: 1100 },
  { width: 390, height: 844, minimumDesktopWidth: 0 },
]) {
  test(`${viewport.width}x${viewport.height} expands and fits the SillyTavern popup wrapper`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openHarness(page);
    await page.evaluate(() => {
      const root = document.querySelector(".tavernary-companion-root")!;
      const dialog = document.createElement("dialog");
      dialog.className = "popup wide_dialogue_popup large_dialogue_popup";
      dialog.open = true;
      const body = document.createElement("div");
      body.className = "popup-body";
      const content = document.createElement("div");
      content.className = "popup-content";
      content.append(root);
      body.append(content);
      dialog.append(body);
      document.body.append(dialog);
    });
    const dialog = await page.locator("dialog.popup").boundingBox();
    const shell = await page.locator(".tavernary-companion-root").boundingBox();
    expect(dialog).not.toBeNull();
    expect(shell).not.toBeNull();
    expect(dialog!.width).toBeGreaterThanOrEqual(viewport.minimumDesktopWidth);
    expect(shell!.x + shell!.width).toBeLessThanOrEqual(viewport.width);
    expect(shell!.y + shell!.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width === 390) {
      await page.getByRole("button", { name: "Filters" }).click();
      await page.getByRole("button", { name: "Close filters" }).click();
      await page.locator(".popup-content").evaluate((content) => {
        content.scrollTop = 64;
      });
      await page.getByRole("tab", { name: "Kits" }).click();
      const header = await page.locator(".tavernary-companion-shell__header").boundingBox();
      expect(header).not.toBeNull();
      expect(header!.y).toBeGreaterThanOrEqual(dialog!.y);
    }
  });
}

test("full-catalog query update stays within the rendering budget", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  expect(await page.locator(".tavernary-companion-project-card").count()).toBeLessThanOrEqual(30);
  await expect(page.getByText("437 projects")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show more projects" })).toBeVisible();
  expect(await page.locator(".tavernary-companion-project-detail").count()).toBe(0);
  const elapsed = await page.evaluate(async () => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Search projects"]')!;
    const started = performance.now();
    input.value = "Alpha";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "Alpha" }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return performance.now() - started;
  });
  expect(elapsed).toBeLessThan(150);
  await expect(page.getByRole("button", { name: "Install Alpha" })).toBeVisible();
});
