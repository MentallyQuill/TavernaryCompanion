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
  const browse = page.getByRole("button", { name: "Browse categories" });
  await expect(browse).toBeVisible();
  expect(await browse.evaluate((button) => button.scrollWidth <= button.clientWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Install Alpha" })).toBeVisible();
});

test("mobile follows Tavernary's compact catalog hierarchy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);

  await expect(page.getByRole("searchbox", { name: "Search projects" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse categories" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Catalog categories" })).not.toBeVisible();
  const toolbar = page.locator(".tavernary-companion-results-toolbar");
  await expect(toolbar).toHaveCSS("display", "flex");
  const count = await toolbar.locator("output").boundingBox();
  const sort = await toolbar.getByRole("combobox", { name: "Sort projects" }).boundingBox();
  expect(count).not.toBeNull();
  expect(sort).not.toBeNull();
  expect(sort!.x - (count!.x + count!.width)).toBeGreaterThanOrEqual(8);
  expect(
    await page
      .locator(".tavernary-companion-catalog-advisory")
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ).toBeLessThanOrEqual(13);
  const firstCard = await page.locator(".tavernary-companion-project-card").first().boundingBox();
  expect(firstCard).not.toBeNull();
  expect(firstCard!.y).toBeLessThanOrEqual(400);
  expect(firstCard!.x).toBeGreaterThanOrEqual(12);
  expect(firstCard!.x).toBeLessThanOrEqual(16);
  expect(firstCard!.x + firstCard!.width).toBeLessThanOrEqual(378);
  const compactAction = await page.getByRole("button", { name: "Install Alpha" }).boundingBox();
  expect(compactAction).not.toBeNull();
  expect(compactAction!.width).toBeGreaterThanOrEqual(44);
  expect(compactAction!.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(compactAction!.width - compactAction!.height)).toBeLessThanOrEqual(1);
  expect(
    await page
      .locator(".tavernary-companion-project-grid")
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
      ),
  ).toBe(1);
});

test("project disclosure, density, sort, and first card follow Tavernary's toolbar rhythm", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);

  const disclosure = page.getByRole("link", {
    name: "Safety: TavernKeeper scans are advisory, not a guarantee. Review a project carefully before installing it or providing credentials.",
  });
  await expect(disclosure).toHaveAttribute("href", "https://tavernary.org/about/#safety-security");
  await expect(disclosure).toHaveCSS("font-size", "11px");
  await expect(disclosure).toHaveCSS("font-family", /Inter/u);

  const toolbar = page.locator(".tavernary-companion-results-toolbar");
  const count = await toolbar.locator("output").boundingBox();
  const densityControl = toolbar.getByRole("button", { name: "Use compact cards" });
  const density = await densityControl.boundingBox();
  const sort = await toolbar.getByRole("combobox", { name: "Sort projects" }).boundingBox();
  const firstCard = await page.locator(".tavernary-companion-project-card").first().boundingBox();
  expect(count).not.toBeNull();
  expect(density).not.toBeNull();
  expect(sort).not.toBeNull();
  expect(firstCard).not.toBeNull();
  expect(density!.x - (count!.x + count!.width)).toBeCloseTo(10, 0);
  expect(sort!.x - (density!.x + density!.width)).toBeCloseTo(10, 0);
  expect(density!.width).toBeCloseTo(30, 0);
  expect(density!.height).toBeCloseTo(30, 0);
  expect(sort!.width).toBeCloseTo(150, 0);
  expect(sort!.height).toBeCloseTo(36, 0);
  expect(firstCard!.y - (sort!.y + sort!.height)).toBeGreaterThanOrEqual(10);
  expect(firstCard!.y - (sort!.y + sort!.height)).toBeLessThanOrEqual(16);

  const standardHeight = firstCard!.height;
  await densityControl.click();
  const standardDensityControl = toolbar.getByRole("button", { name: "Use standard cards" });
  await expect(standardDensityControl).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".tavernary-companion-project-results")).toHaveClass(/is-compact/u);
  await expect(page.getByRole("button", { name: "Install Alpha" })).toBeVisible();
  await standardDensityControl.evaluate((button) => button.blur());
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page).toHaveScreenshot("compact-projects-1440x960.png");
  const compactHeight = await page
    .locator(".tavernary-companion-project-card")
    .first()
    .evaluate((card) => card.getBoundingClientRect().height);
  expect(compactHeight).toBeLessThan(standardHeight);
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

test("native popup integrates a quiet close control into the header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.clock.setFixedTime(new Date("2026-08-18T18:00:00-06:00"));
  await openHarness(page);
  await page.evaluate(() => {
    const root = document.querySelector(".tavernary-companion-root")!;
    const dialog = document.createElement("dialog");
    dialog.className = "popup wide_dialogue_popup large_dialogue_popup transparent_dialogue_popup";
    dialog.style.padding = "4px 14px";
    dialog.style.border = "1px solid rgb(90 90 90)";
    dialog.style.background = "rgb(32 32 32)";
    const close = document.createElement("div");
    close.className = "popup-button-close right_menu_button interactable fa-solid fa-circle-xmark";
    close.dataset.result = "0";
    close.tabIndex = 0;
    close.setAttribute("role", "button");
    close.title = "Close popup";
    const hostStyles = document.createElement("style");
    hostStyles.textContent = `
      .fa-solid { font-family: "Font Awesome 6 Free"; }
      .fa-circle-xmark::before { content: "⊗"; }
    `;
    const body = document.createElement("div");
    body.className = "popup-body";
    const content = document.createElement("div");
    content.className = "popup-content";
    content.append(root);
    body.append(content);
    dialog.append(close, body);
    document.head.append(hostStyles);
    document.body.append(dialog);
    dialog.showModal();
  });

  const styles = await page.locator("dialog.popup").evaluate((dialog) => {
    const computed = getComputedStyle(dialog);
    const backdrop = getComputedStyle(dialog, "::backdrop");
    return {
      backgroundColor: computed.backgroundColor,
      borderWidth: computed.borderWidth,
      padding: computed.padding,
      backdropFilter: backdrop.backdropFilter,
      backdropColor: backdrop.backgroundColor,
    };
  });
  expect(styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(styles.borderWidth).toBe("0px");
  expect(styles.padding).toBe("0px");
  expect(styles.backdropFilter).toContain("blur");
  expect(styles.backdropColor).not.toBe("rgba(0, 0, 0, 0)");

  const root = await page.locator(".tavernary-companion-root").boundingBox();
  const close = await page.getByRole("button", { name: "Close popup" }).boundingBox();
  const refresh = await page.getByRole("button", { name: "Refresh catalog" }).boundingBox();
  expect(root).not.toBeNull();
  expect(close).not.toBeNull();
  expect(refresh).not.toBeNull();
  expect(close!.width).toBeGreaterThanOrEqual(44);
  expect(close!.height).toBeGreaterThanOrEqual(44);
  expect(close!.x).toBeGreaterThanOrEqual(root!.x + root!.width - 60);
  expect(close!.x + close!.width).toBeLessThanOrEqual(root!.x + root!.width - 6);
  expect(close!.y).toBeGreaterThanOrEqual(root!.y + 6);
  expect(close!.y + close!.height).toBeLessThanOrEqual(root!.y + 54);
  expect(refresh!.x + refresh!.width).toBeLessThanOrEqual(close!.x - 6);
  await expect(page.getByRole("button", { name: "Close popup" })).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.getByRole("button", { name: "Close popup" })).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await expect(page.getByRole("button", { name: "Close popup" })).toHaveCSS("box-shadow", "none");
  expect(
    await page
      .getByRole("button", { name: "Close popup" })
      .evaluate((button) => getComputedStyle(button, "::before").content),
  ).toBe('"×" / ""');
  await page.getByRole("button", { name: "Close popup" }).focus();
  await expect(page.getByRole("button", { name: "Close popup" })).toHaveCSS("outline-width", "2px");
  await page.getByRole("button", { name: "Close popup" }).evaluate((button) => button.blur());
  await expect(page).toHaveScreenshot("integrated-close-1440x960.png");
});

test("intermediate desktop keeps the integrated close control inside the panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openHarness(page);
  await page.evaluate(() => {
    const root = document.querySelector(".tavernary-companion-root")!;
    const dialog = document.createElement("dialog");
    dialog.className = "popup wide_dialogue_popup large_dialogue_popup transparent_dialogue_popup";
    const close = document.createElement("div");
    close.className = "popup-button-close right_menu_button interactable fa-solid fa-circle-xmark";
    close.dataset.result = "0";
    close.tabIndex = 0;
    close.setAttribute("role", "button");
    close.title = "Close popup";
    const body = document.createElement("div");
    body.className = "popup-body";
    const content = document.createElement("div");
    content.className = "popup-content";
    content.append(root);
    body.append(content);
    dialog.append(close, body);
    document.body.append(dialog);
    dialog.showModal();
  });

  const root = await page.locator(".tavernary-companion-root").boundingBox();
  const close = await page.getByRole("button", { name: "Close popup" }).boundingBox();
  expect(root).not.toBeNull();
  expect(close).not.toBeNull();
  expect(close!.x).toBeGreaterThanOrEqual(root!.x);
  expect(close!.x + close!.width).toBeLessThanOrEqual(root!.x + root!.width);
  expect(close!.x + close!.width).toBeLessThanOrEqual(796);
});

test("mobile reclaims the external close row and keeps refresh left of close", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-08-18T18:00:00-06:00"));
  await openHarness(page);
  await page.evaluate(() => {
    const root = document.querySelector(".tavernary-companion-root")!;
    const dialog = document.createElement("dialog");
    dialog.className = "popup wide_dialogue_popup large_dialogue_popup transparent_dialogue_popup";
    const close = document.createElement("div");
    close.className = "popup-button-close right_menu_button interactable fa-solid fa-circle-xmark";
    close.dataset.result = "0";
    close.tabIndex = 0;
    close.setAttribute("role", "button");
    close.title = "Close popup";
    const body = document.createElement("div");
    body.className = "popup-body";
    const content = document.createElement("div");
    content.className = "popup-content";
    content.append(root);
    body.append(content);
    dialog.append(close, body);
    document.body.append(dialog);
    dialog.showModal();
  });

  const root = await page.locator(".tavernary-companion-root").boundingBox();
  const close = await page.getByRole("button", { name: "Close popup" }).boundingBox();
  const refresh = await page.getByRole("button", { name: "Refresh catalog" }).boundingBox();
  expect(root).not.toBeNull();
  expect(close).not.toBeNull();
  expect(refresh).not.toBeNull();
  expect(root!.y).toBeLessThanOrEqual(12);
  expect(close!.x).toBeGreaterThanOrEqual(root!.x);
  expect(close!.x + close!.width).toBeLessThanOrEqual(root!.x + root!.width);
  expect(close!.y).toBeGreaterThanOrEqual(root!.y);
  expect(close!.y + close!.height).toBeLessThanOrEqual(root!.y + 56);
  expect(refresh!.x + refresh!.width).toBeLessThanOrEqual(close!.x - 6);
  await expect(page.locator(".tavernary-companion-catalog-freshness")).toBeHidden();
  expect(root!.y + root!.height).toBeLessThanOrEqual(844);
  await page.getByRole("button", { name: "Close popup" }).evaluate((button) => button.blur());
  await expect(page).toHaveScreenshot("integrated-close-390x844.png");
});

test("touch devices hide header freshness even with a desktop-width viewport", async ({
  browser,
}) => {
  const page = await browser.newPage({
    viewport: { width: 980, height: 720 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    await openHarness(page);
    await expect(
      page.locator(".tavernary-companion-shell__header").getByText(/^Updated /u),
    ).toBeHidden();
    await expect(page.getByRole("button", { name: "Refresh catalog" })).toBeVisible();
  } finally {
    await page.close();
  }
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
      await page.getByRole("button", { name: "Open filters" }).click();
      await page.getByRole("button", { name: "Close filters" }).click();
      await page.locator(".popup-content").evaluate((content) => {
        content.scrollTop = 64;
      });
      await page.getByRole("button", { name: "Browse categories" }).click();
      await page
        .getByRole("group", { name: "Browse categories menu" })
        .getByRole("button", { name: "Kits" })
        .click();
      const header = await page.locator(".tavernary-companion-shell__header").boundingBox();
      expect(header).not.toBeNull();
      expect(header!.y).toBeGreaterThanOrEqual(dialog!.y);
    }
  });
}

test("full-catalog query update stays within the rendering budget", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  expect(await page.locator(".tavernary-companion-project-card").count()).toBe(60);
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

test("Kit detail back restores the originating Kit and its focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("tab", { name: /Personal/ }).click();
  const originatingDetails = page
    .locator(".tavernary-companion-kit-card")
    .first()
    .getByRole("button", { name: "Details" });
  await originatingDetails.click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(originatingDetails).toBeFocused();
});
