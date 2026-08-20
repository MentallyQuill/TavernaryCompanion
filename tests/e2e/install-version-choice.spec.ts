import { expect, test, type Locator, type Page } from "@playwright/test";

import { openHarness } from "./harness";

const prohibitedChoiceClaims = /\b(?:safe|unsafe|secure|risky|verified|recommended)\b/iu;
const fullSha = /\b[0-9a-f]{40}\b/iu;

test("distinguishes Latest scanned from Latest from creator when they differ", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openVersionChoice(page, "version-choice");

  const install = installAlpha(page);
  await install.click();
  const chooser = page.getByRole("dialog", { name: "Choose a version for Alpha" });

  await expect(chooser).toBeVisible();
  await expect(chooser.getByRole("button", { name: "Latest scanned" })).toHaveAccessibleDescription(
    "Scanned Aug 17 · older than latest.",
  );
  await expect(
    chooser.getByRole("button", { name: "Latest from creator" }),
  ).toHaveAccessibleDescription("Newer changes have not been scanned yet.");
  const scan = chooser.getByRole("button", { name: /TavernKeeper scan:/u });
  await expect(scan).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(scan).toHaveCSS("border-top-width", "0px");
  await expect(scan).toHaveCSS("width", "18px");
  await scan.hover();
  await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: "Latest from creator" }).focus();
  await scan.focus();
  await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
  await page.keyboard.press("Escape");
  await scan.click();
  await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
  await scan.click();
  await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toHaveCount(0);
  expect(await chooser.textContent()).not.toMatch(prohibitedChoiceClaims);
  expect(await chooser.textContent()).not.toMatch(fullSha);
  await expect(page).toHaveScreenshot("checked-or-newest-1440x960.png");

  await page.keyboard.press("Escape");
  await expect(chooser).not.toBeVisible();
  await expect(install).toBeFocused();
});

test.describe("touch choice", () => {
  test.use({ hasTouch: true });

  test("centers the mobile chooser in its backdrop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openVersionChoice(page, "version-choice");
    await promoteHarnessToNativeModal(page);

    await installAlpha(page).tap();
    const backdrop = page.locator(".tavernary-companion-install-version-chooser-backdrop");
    const chooser = page.getByRole("dialog", { name: "Choose a version for Alpha" });
    const [backdropBox, chooserBox] = await Promise.all([
      backdrop.boundingBox(),
      chooser.boundingBox(),
    ]);

    expect(backdropBox).not.toBeNull();
    expect(chooserBox).not.toBeNull();
    expect(chooserBox!.x + chooserBox!.width / 2).toBeCloseTo(
      backdropBox!.x + backdropBox!.width / 2,
      0,
    );
    expect(chooserBox!.y + chooserBox!.height / 2).toBeCloseTo(
      backdropBox!.y + backdropBox!.height / 2,
      0,
    );
  });

  test("softens the background behind the mobile chooser", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openVersionChoice(page, "version-choice");
    await promoteHarnessToNativeModal(page);

    await installAlpha(page).tap();
    const backdrop = page.locator(".tavernary-companion-install-version-chooser-backdrop");

    await expect(backdrop).toHaveCSS("backdrop-filter", "blur(4px)");
    await expect(backdrop).toHaveCSS("background-color", "rgba(0, 0, 0, 0.32)");
  });

  test("keeps the chooser above a concurrent operation notification", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openVersionChoice(page, "version-choice");

    await installAlpha(page).tap();
    const chooser = page.getByRole("dialog", { name: "Choose a version for Alpha" });
    await page.evaluate(() => {
      const chooser = document.querySelector<HTMLElement>(
        ".tavernary-companion-install-version-chooser",
      );
      if (!chooser) throw new Error("Version chooser is missing");
      const bounds = chooser.getBoundingClientRect();
      const notification = document.createElement("aside");
      notification.className = "tavernary-companion-operation-notification";
      notification.style.insetBlockStart = `${bounds.top + bounds.height / 2 - 40}px`;
      notification.style.insetInlineStart = `${bounds.left + bounds.width / 2}px`;
      notification.style.inlineSize = "240px";
      notification.style.visibility = "visible";
      const action = document.createElement("button");
      action.className = "tavernary-companion-operation-notification__button";
      action.style.blockSize = "80px";
      action.textContent = "Installation complete";
      notification.append(action);
      document.body.append(notification);
    });

    const chooserIsTopmost = await chooser.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        document
          .elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
          ?.closest(".tavernary-companion-install-version-chooser") === element
      );
    });

    expect(chooserIsTopmost).toBe(true);
  });

  test("keeps the chooser on screen and installs the tapped choice", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openVersionChoice(page, "version-choice");

    await installAlpha(page).tap();
    const chooser = page.getByRole("dialog", { name: "Choose a version for Alpha" });
    await expect(chooser).toBeVisible();
    await expectContained(page, chooser);
    await expect(page).toHaveScreenshot("checked-or-newest-390x844.png");

    const scan = chooser.getByRole("button", { name: /TavernKeeper scan:/u });
    await scan.tap();
    await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
    await expect(chooser).toBeVisible();

    await chooser.getByRole("button", { name: "Latest from creator" }).tap();
    await expect(
      page.getByText("Installed the latest version from the creator.", { exact: true }),
    ).toBeVisible();
  });
});

test("installs an exact scanned latest target without asking", async ({ page }) => {
  await openVersionChoice(page, "version-matching");
  await installAlpha(page).click();
  await expect(page.getByRole("dialog", { name: "Choose a version for Alpha" })).toHaveCount(0);
  await expect(
    page.getByText("Installed the latest scanned version.", { exact: true }),
  ).toBeVisible();
});

test("installs a latest-only version without a version popup", async ({ page }) => {
  await openVersionChoice(page, "version-unscanned");
  await installAlpha(page).click();
  await expect(page.getByRole("dialog", { name: /version|latest from creator/iu })).toHaveCount(0);
  await expect(
    page.getByText("Installed the latest version from the creator.", { exact: true }),
  ).toBeVisible();
});

test("installs directly when an older host has only its normal newest path", async ({ page }) => {
  await openVersionChoice(page, "version-legacy");
  await installAlpha(page).click();
  await expect(page.getByRole("dialog", { name: /version|latest from creator/iu })).toHaveCount(0);
  await expect(
    page.getByText("Installed the latest version from the creator.", { exact: true }),
  ).toBeVisible();
});

test("keeps legacy Kit review but removes fake version choices", async ({ page }) => {
  await page.setViewportSize({ width: 512, height: 384 });
  await openHarness(page, "kit-version-legacy");
  await page.getByRole("button", { name: "Browse categories" }).click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await page.getByRole("button", { name: "Install Kit" }).click();

  const preflight = page.getByRole("dialog", { name: "Install Kit review" });
  await expect(preflight).toContainText("Same Version");
  await expect(preflight).toContainText("Different Version");
  await expect(preflight).toContainText("No Check Yet");
  await expect(preflight.getByRole("radio")).toHaveCount(0);
  await expect(preflight).not.toContainText("Update SillyTavern");
  await expect(preflight.getByRole("button", { name: "Install Kit" })).toBeEnabled();
});

test("keeps mixed Kit choices in one preflight list at 200% zoom", async ({ page }) => {
  // A 512x384 CSS viewport models a 1024x768 screen at 200% browser zoom.
  await page.setViewportSize({ width: 512, height: 384 });
  await openHarness(page, "kit-version-choice");
  await page.getByRole("button", { name: "Browse categories" }).click();
  await page
    .getByRole("group", { name: "Browse categories menu" })
    .getByRole("button", { name: "Kits" })
    .click();
  await page.getByRole("tab", { name: /Personal/u }).click();
  await page.getByRole("button", { name: "Install Kit" }).click();

  const preflight = page.getByRole("dialog", { name: "Install Kit review" });
  await expect(preflight.getByRole("heading", { name: "Install", exact: true })).toHaveCount(1);
  await expect(preflight).toContainText("Same Version");
  await expect(preflight).toContainText("Different Version");
  await expect(preflight).toContainText("No Check Yet");
  expect(await preflight.textContent()).not.toMatch(fullSha);
  const confirm = preflight.getByRole("button", { name: "Install Kit" });
  await expect(confirm).toBeDisabled();
  await preflight.getByRole("radio", { name: "Latest scanned for Different Version" }).click();
  await expect(confirm).toBeEnabled();
  await expectContained(page, preflight);
});

async function openVersionChoice(page: Page, scenario: string): Promise<void> {
  await page.clock.setFixedTime(new Date("2026-08-19T18:00:00-06:00"));
  await openHarness(page, scenario);
  await page
    .locator(".tavernary-companion-shell__header")
    .getByRole("searchbox", { name: "Search projects" })
    .fill("Alpha");
}

function installAlpha(page: Page): Locator {
  return page.locator('[data-project-id="alpha"]').getByRole("button", { name: "Install Alpha" });
}

async function promoteHarnessToNativeModal(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.querySelector(".tavernary-companion-root");
    if (!root) throw new Error("Companion root is missing");
    const dialog = document.createElement("dialog");
    dialog.className = "popup wide_dialogue_popup large_dialogue_popup transparent_dialogue_popup";
    const body = document.createElement("div");
    body.className = "popup-body";
    const content = document.createElement("div");
    content.className = "popup-content";
    content.append(root);
    body.append(content);
    dialog.append(body);
    document.body.append(dialog);
    dialog.showModal();
  });
}

async function expectContained(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  expect(await locator.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
}
