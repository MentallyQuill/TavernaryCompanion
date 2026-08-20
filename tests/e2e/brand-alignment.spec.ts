import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("shell uses Tavernary's production brand lockup and visual tokens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);

  await expect(page.getByRole("img", { name: "Tavernary" })).toBeVisible();
  await expect(page.getByText("Where AI roleplay tools gather")).toHaveCount(0);
  await expect(page.getByText("Companion", { exact: true })).toBeVisible();
  await expect(
    page.locator(".tavernary-companion-shell__header").getByRole("searchbox", {
      name: "Search projects",
    }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Catalog categories" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse categories" })).not.toBeVisible();

  const tokens = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".tavernary-companion-root")!;
    const header = document.querySelector<HTMLElement>(".tavernary-companion-shell__header")!;
    const tabs = document.querySelector<HTMLElement>(".tavernary-companion-category-navigation")!;
    const activeTab = document.querySelector<HTMLElement>(
      '.tavernary-companion-category-navigation [aria-pressed="true"]',
    )!;
    const styles = getComputedStyle(root);
    const wordmark = getComputedStyle(document.querySelector(".tavernary-companion-brand h1")!);
    const name = document.querySelector<HTMLElement>(".tavernary-companion-brand__name")!;
    const companion = document.querySelector<HTMLElement>(".tavernary-companion-brand__companion")!;
    const nameBox = name.getBoundingClientRect();
    const companionBox = companion.getBoundingClientRect();
    const companionStyles = getComputedStyle(companion);
    const freshness = getComputedStyle(
      document.querySelector(".tavernary-companion-catalog-freshness")!,
    );
    const refresh = getComputedStyle(document.querySelector('[aria-label="Refresh catalog"]')!);
    return {
      canvas: getComputedStyle(root).backgroundColor,
      header: getComputedStyle(header).backgroundColor,
      navigation: getComputedStyle(tabs).backgroundColor,
      active: getComputedStyle(activeTab).color,
      font: styles.fontFamily,
      focus: styles.getPropertyValue("--tavernary-color-focus-ring").trim(),
      primary: styles.getPropertyValue("--tavernary-color-action-primary-bg").trim(),
      wordmarkSize: Number.parseFloat(wordmark.fontSize),
      companionColor: companionStyles.color,
      companionFont: companionStyles.fontFamily,
      companionTransform: companionStyles.textTransform,
      nameWidth: nameBox.width,
      companionWidth: companionBox.width,
      nameTop: nameBox.top,
      companionTop: companionBox.top,
      freshnessSize: Number.parseFloat(freshness.fontSize),
      refreshSize: Number.parseFloat(refresh.fontSize),
      refreshHeight: Number.parseFloat(refresh.height),
    };
  });

  expect(tokens).toEqual({
    canvas: "rgb(13, 17, 23)",
    header: "rgb(16, 24, 32)",
    navigation: "rgb(18, 26, 31)",
    active: "rgb(230, 237, 243)",
    font: expect.stringContaining("Inter Variable"),
    focus: "#5eead4",
    primary: "#e18a24",
    wordmarkSize: expect.any(Number),
    companionColor: "rgb(168, 179, 186)",
    companionFont: expect.stringContaining("Inter Variable"),
    companionTransform: "uppercase",
    nameWidth: expect.any(Number),
    companionWidth: expect.any(Number),
    nameTop: expect.any(Number),
    companionTop: expect.any(Number),
    freshnessSize: expect.any(Number),
    refreshSize: expect.any(Number),
    refreshHeight: expect.any(Number),
  });
  expect(tokens.wordmarkSize).toBeLessThanOrEqual(22);
  expect(Math.abs(tokens.nameWidth - tokens.companionWidth)).toBeLessThanOrEqual(1);
  expect(tokens.companionTop).toBeGreaterThan(tokens.nameTop);
  expect(tokens.freshnessSize).toBeLessThanOrEqual(11);
  expect(tokens.refreshSize).toBeLessThanOrEqual(11);
  expect(tokens.refreshHeight).toBeLessThanOrEqual(34);
});

test("mobile brand header stays contained and readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await page.locator("#app").evaluate((app) => {
    app.style.width = "310px";
  });

  const shell = await page.getByTestId("companion-shell").boundingBox();
  const brand = await page.locator(".tavernary-companion-brand").boundingBox();
  const utilities = await page.locator(".tavernary-companion-shell__utilities").boundingBox();
  expect(shell).not.toBeNull();
  expect(brand).not.toBeNull();
  expect(utilities).not.toBeNull();
  expect(shell!.x).toBeGreaterThanOrEqual(0);
  expect(shell!.x + shell!.width).toBeLessThanOrEqual(390);
  expect(brand!.x + brand!.width).toBeLessThanOrEqual(shell!.x + shell!.width);
  expect(brand!.x + brand!.width).toBeLessThanOrEqual(utilities!.x);
  await expect(page.getByText("Where AI roleplay tools gather")).toHaveCount(0);
  await expect(
    page.locator(".tavernary-companion-shell__header").getByRole("searchbox", {
      name: "Search projects",
    }),
  ).toBeVisible();
  const browse = page.getByRole("button", { name: "Browse categories" });
  await expect(browse).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Catalog categories" })).not.toBeVisible();
  await page.getByRole("button", { name: "Open filters" }).click();
  await expect(page.getByRole("img", { name: "Tavernary" })).toBeInViewport();
  await page.getByRole("button", { name: "Close filters" }).click();
  await browse.click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Kits" })
    .click();
  await expect(page.getByRole("img", { name: "Tavernary" })).toBeInViewport();
  await expect(browse).toContainText("Kits");
  await expect(page.getByRole("tab", { name: /Personal/u })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("button", { name: "Kit filters" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Published/u }).click();
  await expect(page.getByRole("button", { name: "Kit filters" })).toBeVisible();
  await expect(page.locator(".tavernary-companion-kit-filter-panel")).not.toBeVisible();
  await expect(page.getByText("No Kits match the current view.")).toBeInViewport();
  await page.getByRole("button", { name: "Kit filters" }).click();
  await expect(page.locator(".tavernary-companion-kit-filter-panel")).toBeVisible();
  await page.getByRole("button", { name: "Close Kit filters" }).last().click();
  await expect(page.locator(".tavernary-companion-kit-filter-panel")).not.toBeVisible();
});

test("desktop filters use Tavernary's persistent flush rail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);

  await expect(page.getByRole("button", { name: "Open filters" })).not.toBeVisible();
  const surface = page.locator(".tavernary-companion-filter-surface");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(230);
  expect(box!.width).toBeLessThanOrEqual(245);
  await expect(surface).toHaveCSS("background-color", "rgb(18, 26, 31)");
  await expect(surface).toHaveCSS("border-radius", "0px");
  await expect(surface.getByRole("heading", { name: "Filters" })).toBeVisible();
  await expect(surface.getByText("Refine catalog")).not.toBeVisible();
  const filterMetrics = await surface.evaluate((element) => {
    const metric = (selector: string) => getComputedStyle(element.querySelector(selector)!);
    const surface = getComputedStyle(element);
    const header = metric(".tavernary-companion-filter-surface__header");
    const panel = metric(".tavernary-companion-filter-panel");
    const title = metric(".tavernary-companion-filter-surface__header h2");
    const clear = metric(".tavernary-companion-filter-clear");
    const groupHeading = metric(".tavernary-companion-filter-group legend");
    const searchElement = element.querySelector<HTMLElement>(".tavernary-companion-filter-search")!;
    const search = getComputedStyle(searchElement);
    const searchPlaceholder = getComputedStyle(searchElement, "::placeholder");
    const row = metric(".tavernary-companion-filter-option");
    const lastGroup = metric(".tavernary-companion-filter-group:last-child");
    const tagSection = metric(".tavernary-companion-filter-tag-browser");
    const tagHeading = metric(".tavernary-companion-filter-tag-browser > h3");
    const tagBrowser = metric(".tavernary-companion-tag-browser");
    const tagStatus = metric(".tavernary-companion-tag-browser__status");
    const metadata = metric(".tavernary-companion-filter-options--chips");
    const chip = metric(".tavernary-companion-filter-choice__chip");
    return {
      surfacePadding: surface.padding,
      headerPadding: header.padding,
      headerMargin: header.marginBottom,
      panelPadding: panel.padding,
      titleSize: title.fontSize,
      clearSize: clear.fontSize,
      clearColor: clear.color,
      groupHeadingSize: groupHeading.fontSize,
      searchHeight: search.height,
      searchSize: search.fontSize,
      searchPlaceholderColor: searchPlaceholder.color,
      rowHeight: row.height,
      rowSize: row.fontSize,
      lastGroupPaddingBottom: lastGroup.paddingBottom,
      tagSectionPadding: tagSection.paddingTop,
      tagSectionBorder: tagSection.borderTopWidth,
      tagHeadingSize: tagHeading.fontSize,
      tagHeadingMargin: tagHeading.marginBottom,
      tagDisplay: tagBrowser.display,
      tagGap: tagBrowser.gap,
      tagStatusJustification: tagStatus.justifyContent,
      tagStatusMargin: tagStatus.marginBottom,
      tagStatusSize: tagStatus.fontSize,
      metadataMargin: metadata.marginTop,
      chipHeight: chip.height,
      chipSize: chip.fontSize,
    };
  });
  expect(filterMetrics).toEqual({
    surfacePadding: "20px 18px 50px",
    headerPadding: "0px",
    headerMargin: "12px",
    panelPadding: "0px",
    titleSize: "13px",
    clearSize: "10px",
    clearColor: "rgb(130, 144, 153)",
    groupHeadingSize: "10px",
    searchHeight: "32px",
    searchSize: "10px",
    searchPlaceholderColor: "rgb(113, 128, 135)",
    rowHeight: "27px",
    rowSize: "11px",
    lastGroupPaddingBottom: "0px",
    tagSectionPadding: "18px",
    tagSectionBorder: "1px",
    tagHeadingSize: "10px",
    tagHeadingMargin: "8px",
    tagDisplay: "grid",
    tagGap: "8px",
    tagStatusJustification: "space-between",
    tagStatusMargin: "0px",
    tagStatusSize: "9px",
    metadataMargin: "10px",
    chipHeight: "26px",
    chipSize: "9px",
  });

  const workspace = page.locator(".tavernary-companion-projects-route__workspace");
  const workspaceBox = await workspace.boundingBox();
  const routeBox = await page.locator(".tavernary-companion-projects-route").boundingBox();
  expect(workspaceBox).not.toBeNull();
  expect(routeBox).not.toBeNull();
  expect(workspaceBox!.x).toBe(routeBox!.x);
  expect(workspaceBox!.y).toBe(routeBox!.y);
  expect(box!.y).toBe(routeBox!.y);
  expect(
    await page
      .locator(".tavernary-companion-project-grid")
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
      ),
  ).toBe(3);
  const modelFamily = surface.getByRole("checkbox", { name: "Model-Agnostic" });
  const modelFamilyChip = modelFamily.locator("../..");
  await expect(modelFamilyChip).toHaveCSS("order", "1");
  await modelFamily.check({ force: true });
  await expect(modelFamilyChip).toHaveCSS("order", "0");

  await page.addStyleTag({
    content: `
      input[type="checkbox"]::before {
        box-shadow: inset 1em 1em rgb(255 0 255);
        clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        transform-origin: bottom left;
      }
    `,
  });

  const selectedIndicators = await Promise.all(
    [
      surface.getByRole("checkbox", { name: "SillyTavern" }),
      surface.getByRole("checkbox", { name: "Extension" }),
    ].map((indicator) =>
      indicator.evaluate((element) => {
        const control = getComputedStyle(element);
        const mark = getComputedStyle(element, "::before");
        return {
          appearance: control.appearance,
          background: control.backgroundColor,
          mark: mark.borderBlockEndColor,
          markBoxShadow: mark.boxShadow,
          markClipPath: mark.clipPath,
        };
      }),
    ),
  );
  expect(selectedIndicators).toEqual([
    {
      appearance: "none",
      background: "rgb(27, 74, 70)",
      mark: "rgb(240, 245, 247)",
      markBoxShadow: "none",
      markClipPath: "none",
    },
    {
      appearance: "none",
      background: "rgb(27, 74, 70)",
      mark: "rgb(240, 245, 247)",
      markBoxShadow: "none",
      markClipPath: "none",
    },
  ]);
});

test("filter disclosures use Tavernary's compact text size", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "filter-disclosure");

  const disclosure = page.getByRole("button", { name: /Show \d+ more/u }).first();
  await expect(disclosure).toBeVisible();
  await expect(disclosure).toHaveCSS("font-size", "10px");
  await disclosure.click();
  const collapse = page.getByRole("button", { name: "Show fewer" }).first();
  await expect(collapse).toBeVisible();
  await expect(collapse).toHaveCSS("font-size", "10px");
});

test("compact desktop keeps Tavernary's 210px persistent rail", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openHarness(page);

  await expect(page.getByRole("button", { name: "Open filters" })).not.toBeVisible();
  const route = page.locator(".tavernary-companion-projects-route");
  const surface = page.locator(".tavernary-companion-filter-surface");
  const [routeBox, surfaceBox] = await Promise.all([route.boundingBox(), surface.boundingBox()]);
  expect(routeBox).not.toBeNull();
  expect(surfaceBox).not.toBeNull();
  expect(surfaceBox!.x).toBe(routeBox!.x);
  expect(surfaceBox!.y).toBe(routeBox!.y);
  expect(surfaceBox!.width).toBe(210);
  expect(
    await page
      .locator(".tavernary-companion-project-grid")
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
      ),
  ).toBe(2);
});

test("mobile filters use Tavernary's compact icon and inset refinement sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);

  const trigger = page.getByRole("button", { name: "Open filters" });
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(triggerBox!.width).toBe(44);
  expect(triggerBox!.height).toBe(44);
  await expect(trigger).toHaveCSS("background-color", "rgb(18, 26, 31)");
  await expect(trigger).toHaveCSS("border-radius", "6px");

  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Project filters" });
  const sheetBox = await sheet.boundingBox();
  expect(sheetBox).not.toBeNull();
  expect(sheetBox!.x).toBeGreaterThanOrEqual(12);
  expect(sheetBox!.x + sheetBox!.width).toBeLessThanOrEqual(378);
  await expect(sheet).toHaveCSS("background-color", "rgb(28, 40, 46)");
  await expect(sheet.getByText("Refine catalog")).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Filters" })).toBeVisible();
  const mobileFilterMetrics = await sheet.evaluate((element) => {
    const metric = (selector: string) => getComputedStyle(element.querySelector(selector)!);
    return {
      groupPadding: metric(".tavernary-companion-filter-group").paddingTop,
      tagSectionPadding: metric(".tavernary-companion-filter-tag-browser").paddingTop,
      tagBrowserPadding: metric(".tavernary-companion-tag-browser").paddingTop,
      metadataPreviewHeight: metric(".tavernary-companion-filter-options--chips").maxHeight,
    };
  });
  expect(mobileFilterMetrics).toEqual({
    groupPadding: "18px",
    tagSectionPadding: "18px",
    tagBrowserPadding: "0px",
    metadataPreviewHeight: "194px",
  });
  const close = sheet.getByRole("button", { name: "Close filters" });
  const closeBox = await close.boundingBox();
  expect(closeBox).not.toBeNull();
  expect(closeBox!.width).toBe(44);
  expect(closeBox!.height).toBe(44);
  const kindCheckbox = sheet.getByRole("checkbox", { name: "Extension" });
  const kindCheckboxBox = await kindCheckbox.boundingBox();
  const kindRowBox = await kindCheckbox.locator("..").boundingBox();
  expect(kindCheckboxBox).not.toBeNull();
  expect(kindRowBox).not.toBeNull();
  expect(kindCheckboxBox!.width).toBe(14);
  expect(kindCheckboxBox!.height).toBe(14);
  expect(kindRowBox!.height).toBeGreaterThanOrEqual(44);
});

test("project cards use Tavernary's surface, evidence hierarchy, and action color", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await expect(page.locator(".tavernary-companion-kit-card")).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-installed-section")).toHaveCount(0);
  const search = page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" });
  await search.fill("Alpha");
  const card = page.locator('[data-project-id="alpha"]');
  const lifecycle = card.getByTestId("project-lifecycle-action");
  const styles = await card.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      border: computed.borderTopColor,
      radius: computed.borderRadius,
      padding: computed.padding,
      shadow: computed.boxShadow,
    };
  });
  expect(styles).toEqual({
    background: "rgb(24, 34, 40)",
    border: "rgb(43, 58, 64)",
    radius: "8px",
    padding: "15px",
    shadow: "rgba(0, 0, 0, 0.24) 0px 1px 2px 0px, rgba(0, 0, 0, 0.12) 0px 4px 12px 0px",
  });
  const identity = card.locator(".tavernary-companion-project-card__kind");
  await expect(identity).toHaveCSS("color", "rgb(225, 138, 36)");
  await expect(identity).toHaveCSS("font-size", "9px");
  const functionIcon = identity.locator('[data-icon="memory-retrieval"]');
  await expect(functionIcon).toBeVisible();
  expect((await functionIcon.boundingBox())?.width).toBe(23);
  const scan = card.getByRole("button", { name: "TavernKeeper scan: Not assessed." });
  await expect(scan).toHaveCSS("color", "rgb(130, 144, 153)");
  await expect(scan.locator('[data-icon="scan-fill"]')).toBeVisible();
  expect((await scan.boundingBox())?.width).toBe(18);
  await expect(card.locator(".tavernary-companion-activity-strip i")).toHaveCount(12);
  await expect(card.locator(".tavernary-companion-activity-summary")).toHaveCSS("display", "grid");
  await expect(card.locator(".tavernary-companion-activity-strip i.is-active").first()).toHaveCSS(
    "background-color",
    "rgb(230, 237, 243)",
  );
  await expect(card.getByText("Today")).toBeVisible();
  await expect(card.locator(".tavernary-companion-project-card__community")).toContainText("11");
  await expect(card.getByText("2.0 MB repo")).toBeVisible();
  const [topBox, titleBox, activityBox, activityAgeBox, communityBox, repositoryBox] =
    await Promise.all([
      card.locator(".tavernary-companion-project-card__top").boundingBox(),
      card.locator(".tavernary-companion-project-card__title").boundingBox(),
      card.locator(".tavernary-companion-activity-summary").boundingBox(),
      card.locator(".tavernary-companion-project-card__activity-age").boundingBox(),
      card.locator(".tavernary-companion-project-card__community").boundingBox(),
      card.locator(".tavernary-companion-project-card__repository-size").boundingBox(),
    ]);
  expect(titleBox!.y - (topBox!.y + topBox!.height)).toBeCloseTo(2, 0);
  expect(topBox!.x + topBox!.width - (activityAgeBox!.x + activityAgeBox!.width)).toBeCloseTo(0, 0);
  expect(communityBox!.x).toBeCloseTo(activityBox!.x, 0);
  expect(repositoryBox!.x - (communityBox!.x + communityBox!.width)).toBeGreaterThanOrEqual(24);
  const summary = card.locator(".tavernary-companion-project-card__summary");
  await expect(summary).toHaveCSS("font-size", "11px");
  expect(
    Number.parseFloat(await summary.evaluate((element) => getComputedStyle(element).lineHeight)),
  ).toBeCloseTo(16.28, 1);
  const frontendChip = card.locator(".tavernary-companion-chip--frontend");
  await expect(frontendChip).toHaveCSS("color", "rgb(214, 40, 57)");
  await expect(frontendChip).toHaveCSS("background-color", "rgb(24, 34, 40)");
  await expect(frontendChip).toHaveCSS("border-radius", "4px");
  await expect(frontendChip).toHaveCSS("font-size", "8px");
  await expect(card.locator(".tavernary-companion-chip--tag").first()).toHaveCSS(
    "color",
    "rgb(168, 179, 186)",
  );
  await expect(card.locator(".license-osi-approved")).toHaveCSS("color", "rgb(87, 197, 163)");
  const source = card.getByRole("link", { name: "Alpha" });
  await expect(source).toHaveAttribute("href", "https://example.com/alpha");
  await expect(source).toHaveAttribute("target", "_blank");
  const installBox = await lifecycle.boundingBox();
  const kit = card.getByRole("button", { name: "Add Alpha to Kit" });
  const kitBox = await kit.boundingBox();
  const installFace = lifecycle.locator(".tavernary-companion-project-lifecycle__face");
  const kitFace = kit.locator(".tavernary-companion-project-kit-control__face");
  const kitGlyph = kit.locator('[data-kit-glyph="add"]');
  const kitLabel = kit.getByText("Kit", { exact: true });
  const [installFaceBox, kitFaceBox, kitGlyphBox, kitLabelBox] = await Promise.all([
    installFace.boundingBox(),
    kitFace.boundingBox(),
    kitGlyph.boundingBox(),
    kitLabel.boundingBox(),
  ]);
  expect(installBox).not.toBeNull();
  expect(kitBox).not.toBeNull();
  expect(installFaceBox).not.toBeNull();
  expect(kitFaceBox).not.toBeNull();
  expect(kitGlyphBox).not.toBeNull();
  expect(kitLabelBox).not.toBeNull();
  expect(installBox!.x).toBeLessThan(kitBox!.x);
  expect(kitBox!.x - (installBox!.x + installBox!.width)).toBeCloseTo(4, 0);
  await expect(lifecycle.locator('[data-icon="install"]')).toBeVisible();
  await expect(kitLabel).toBeVisible();
  expect(installBox!.width).toBe(34);
  expect(installBox!.height).toBe(34);
  expect(kitBox!.width).toBe(34);
  expect(kitBox!.height).toBe(34);
  expect(installFaceBox!.width).toBe(34);
  expect(installFaceBox!.height).toBe(34);
  expect(kitFaceBox!.width).toBe(34);
  expect(kitFaceBox!.height).toBe(34);
  expect(kitGlyphBox!.x + kitGlyphBox!.width / 2).toBeCloseTo(
    kitFaceBox!.x + kitFaceBox!.width / 2,
    1,
  );
  expect(kitGlyphBox!.y + kitGlyphBox!.height / 2).toBeCloseTo(
    kitFaceBox!.y + kitFaceBox!.height / 2,
    1,
  );
  expect(kitLabelBox!.y).toBeGreaterThan(kitFaceBox!.y + kitFaceBox!.height / 2);
  expect(kitLabelBox!.y + kitLabelBox!.height).toBeLessThanOrEqual(
    kitFaceBox!.y + kitFaceBox!.height,
  );
  expect(kitLabelBox!.x).toBeGreaterThanOrEqual(kitFaceBox!.x);
  expect(kitLabelBox!.x + kitLabelBox!.width).toBeLessThanOrEqual(
    kitFaceBox!.x + kitFaceBox!.width,
  );
  await expect(kitLabel).toHaveCSS("color", "rgb(22, 16, 8)");
  await expect(kitFace).toHaveCSS("color", "rgb(22, 16, 8)");

  await identity.hover();
  const typeTooltip = page.getByRole("tooltip");
  await expect(typeTooltip).toHaveText("Memory & Retrieval Extension");
  await expect(typeTooltip).toHaveCSS("font-size", "9px");
  await expect(typeTooltip).toHaveCSS("background-color", "rgb(13, 17, 23)");
  expect(await typeTooltip.evaluate((element) => element.parentElement === document.body)).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(typeTooltip).toHaveCount(0);

  await lifecycle.focus();
  await expect(page.getByRole("tooltip")).toHaveText("Install");
  await page.keyboard.press("Escape");

  await scan.hover();
  const scanPanel = page.getByRole("dialog", { name: "TavernKeeper Scan Results" });
  await expect(scanPanel).toBeVisible();
  await expect(
    scanPanel.getByText("This project hasn't been scanned by TavernKeeper."),
  ).toBeVisible();
  expect(await scanPanel.evaluate((element) => element.parentElement === document.body)).toBe(true);
  await page.keyboard.press("Escape");

  await search.fill("Beta Preset");
  const preset = page.locator('[data-project-id="beta-preset"]');
  await expect(preset.locator(".tavernary-companion-project-card__kind")).toHaveCSS(
    "color",
    "rgb(87, 197, 163)",
  );
  await expect(preset.locator('[data-icon="preset"]')).toBeVisible();
  await expect(preset.getByText("System Preset")).toBeVisible();
  await expect(preset.getByText("v1.2.0")).toBeVisible();
  await expect(preset.getByText("Model-Agnostic")).toBeVisible();
  await expect(preset.getByText("Chat Completion")).toBeVisible();

  await search.fill("Gamma Frontend");
  await page.getByRole("checkbox", { name: "Frontend", exact: true }).check();
  const frontend = page.locator('[data-project-id="gamma-frontend"]');
  await expect(frontend).toBeVisible();
  await expect(frontend.locator(".tavernary-companion-project-card__kind")).toHaveCSS(
    "color",
    "rgb(214, 40, 57)",
  );
  await expect(frontend.locator('[data-icon="frontend"]')).toBeVisible();
});

test("project activity evidence stays compact at three-column widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "wide-repository-size");
  await page.addStyleTag({
    content: ".tavernary-companion-project-grid { grid-template-columns: repeat(3, 286px); }",
  });
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");

  const card = page.locator('[data-project-id="alpha"]');
  const identity = card.locator(".tavernary-companion-project-card__kind");
  const development = card.locator(".tavernary-companion-project-card__development");
  const activityLabel = card.locator(".tavernary-companion-activity-summary > b");
  const activityStrip = card.locator(".tavernary-companion-activity-strip");
  const activityAge = card.locator(".tavernary-companion-project-card__activity-age");
  const community = card.locator(".tavernary-companion-project-card__community");
  const repositorySize = card.locator(".tavernary-companion-project-card__repository-size");
  await expect(repositorySize).toHaveText("28.0 MB repo");

  const [identityBox, developmentBox, labelBox, stripBox, ageBox, communityBox, repositoryBox] =
    await Promise.all([
      identity.boundingBox(),
      development.boundingBox(),
      activityLabel.boundingBox(),
      activityStrip.boundingBox(),
      activityAge.boundingBox(),
      community.boundingBox(),
      repositorySize.boundingBox(),
    ]);

  expect(developmentBox!.y).toBeCloseTo(identityBox!.y, 0);
  expect(stripBox!.y - (labelBox!.y + labelBox!.height)).toBeGreaterThanOrEqual(1);
  expect(labelBox!.height).toBeLessThan(ageBox!.height);
  expect(stripBox!.x).toBeCloseTo(communityBox!.x, 0);
  expect(repositoryBox!.x + repositoryBox!.width).toBeCloseTo(ageBox!.x + ageBox!.width, 0);
});

test("mobile project cards retain Tavernary geometry without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");

  const card = page.locator('[data-project-id="alpha"]');
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(12);
  expect(box!.x + box!.width).toBeLessThanOrEqual(378);
  const [topBox, activityBox, activityAgeBox, communityBox, repositoryBox] = await Promise.all([
    card.locator(".tavernary-companion-project-card__top").boundingBox(),
    card.locator(".tavernary-companion-activity-summary").boundingBox(),
    card.locator(".tavernary-companion-project-card__activity-age").boundingBox(),
    card.locator(".tavernary-companion-project-card__community").boundingBox(),
    card.locator(".tavernary-companion-project-card__repository-size").boundingBox(),
  ]);
  expect(topBox!.x + topBox!.width - (activityAgeBox!.x + activityAgeBox!.width)).toBeCloseTo(0, 0);
  expect(communityBox!.x).toBeCloseTo(activityBox!.x, 0);
  expect(repositoryBox!.x - (communityBox!.x + communityBox!.width)).toBeGreaterThanOrEqual(24);
  await expect(card.locator(".tavernary-companion-project-card__chips")).toHaveCSS(
    "max-height",
    "40px",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});

test("TavernKeeper assessment stays compact, readable, and contained", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");

  const trigger = page.getByRole("button", { name: "TavernKeeper scan: Not assessed." });
  await trigger.click();
  const assessment = page.getByRole("dialog", { name: "TavernKeeper Scan Results" });
  await expect(assessment).toBeVisible();
  await expect(
    assessment.getByText("This project hasn't been scanned by TavernKeeper."),
  ).toBeVisible();
  await expect(assessment).toHaveCSS("text-align", "start");
  const box = await assessment.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390 - 8);

  await page.keyboard.press("Escape");
  await expect(assessment).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Kits and Installed reuse the Tavernary card and control system", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Kits" })
    .click();
  await expect(page.getByRole("tab", { name: /Personal/u })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: /Published/u }).click();
  await expect(page.getByRole("button", { name: "Kit filters" })).not.toBeVisible();
  await expect(page.locator(".tavernary-companion-kit-filter-panel")).toBeVisible();
  await page.getByRole("tab", { name: /Personal/ }).click();
  const kit = page.locator(".tavernary-companion-kit-card").first();
  await expect(kit).toHaveCSS("background-color", "rgb(24, 34, 40)");
  await expect(kit).toHaveCSS("border-radius", "8px");
  await expect(kit.locator(".tavernary-companion-kit-card__primary")).toHaveCSS(
    "background-color",
    "rgb(225, 138, 36)",
  );

  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();
  await expect(page.locator(".tavernary-companion-project-card")).toHaveCount(0);
  await expect(page.locator(".tavernary-companion-installed-section")).toHaveCount(1);
  await expect(page.locator(".tavernary-companion-installed-card").first()).toHaveCSS(
    "background-color",
    "rgb(24, 34, 40)",
  );
  const installedLifecycle = page.getByRole("button", { name: "Uninstall Writer Tool" });
  const installedLifecycleFace = installedLifecycle.locator(
    ".tavernary-companion-project-lifecycle__face",
  );
  const [installedLifecycleBox, installedLifecycleFaceBox] = await Promise.all([
    installedLifecycle.boundingBox(),
    installedLifecycleFace.boundingBox(),
  ]);
  expect(installedLifecycleBox!.width).toBe(44);
  expect(installedLifecycleBox!.height).toBe(44);
  expect(installedLifecycleFaceBox!.width).toBe(44);
  expect(installedLifecycleFaceBox!.height).toBe(44);
});

test("desktop Installed content starts on the compact route rhythm", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page, "installed-update");
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const route = page.locator(".tavernary-companion-installed-route");
  const firstGroup = route
    .locator(
      "> .tavernary-companion-installed-kits, > .tavernary-companion-installed-section",
    )
    .first();
  const [routeBox, firstGroupBox] = await Promise.all([
    route.boundingBox(),
    firstGroup.boundingBox(),
  ]);

  expect(routeBox).not.toBeNull();
  expect(firstGroupBox).not.toBeNull();
  expect(firstGroupBox!.y - routeBox!.y).toBeLessThanOrEqual(58);
});

test("desktop Installed refresh status preserves the compact route rhythm", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const route = page.locator(".tavernary-companion-installed-route");
  const toolbar = route.locator("> .tavernary-companion-route-toolbar");
  await toolbar.evaluate((element) => {
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = "Updating installed extensions…";
    element.insertBefore(status, element.lastElementChild);
  });
  const firstGroup = route
    .locator(
      "> .tavernary-companion-installed-kits, > .tavernary-companion-installed-section",
    )
    .first();
  const [routeBox, firstGroupBox] = await Promise.all([
    route.boundingBox(),
    firstGroup.boundingBox(),
  ]);

  expect(routeBox).not.toBeNull();
  expect(firstGroupBox).not.toBeNull();
  expect(firstGroupBox!.y - routeBox!.y).toBeLessThanOrEqual(58);
});

test("desktop Installed check action uses compact control typography", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();

  const checkAgain = page.getByRole("button", { name: "Check for updates" });
  await expect(checkAgain).toHaveCSS("font-size", "11px");
  expect((await checkAgain.boundingBox())!.height).toBe(34);
});

test("mobile Kits and Installed use the compact shared route grammar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  const browse = page.getByRole("button", { name: "Browse categories" });

  await browse.click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Kits" })
    .click();
  const kitsToolbar = page.locator(".tavernary-companion-route-toolbar");
  await expect(kitsToolbar).toHaveCSS("display", "flex");
  await expect(kitsToolbar.locator("> strong")).not.toBeVisible();
  await page.getByRole("tab", { name: /Personal/ }).click();
  const kitCard = await page.locator(".tavernary-companion-kit-card").first().boundingBox();
  expect(kitCard).not.toBeNull();
  expect(kitCard!.x).toBeGreaterThanOrEqual(12);
  expect(kitCard!.x).toBeLessThanOrEqual(16);
  expect(kitCard!.y).toBeLessThanOrEqual(460);

  await browse.click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Installed" })
    .click();
  const installedToolbar = page.locator(".tavernary-companion-route-toolbar");
  await expect(installedToolbar).toHaveCSS("display", "flex");
  await expect(installedToolbar.locator("> strong")).not.toBeVisible();
  const installed = await page
    .locator(".tavernary-companion-installed-section")
    .first()
    .boundingBox();
  expect(installed).not.toBeNull();
  expect(installed!.x).toBeGreaterThanOrEqual(12);
  expect(installed!.x).toBeLessThanOrEqual(16);
  const installedMetadata = page
    .locator(".tavernary-companion-installed-card > header > span")
    .first();
  await expect(installedMetadata).toHaveCSS("color", "rgb(130, 144, 153)");
  expect(
    await installedMetadata.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeLessThanOrEqual(13);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
