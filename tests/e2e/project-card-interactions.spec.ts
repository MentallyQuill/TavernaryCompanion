import { expect, test, type Locator, type Page } from "@playwright/test";

import { openHarness } from "./harness";

test("native popup keeps every card tooltip and the desktop scan panel in its top layer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  const owner = await promoteHarnessToNativeModal(page);
  const alpha = page.locator('.tavernary-companion-project-card[data-project-id="alpha"]');

  await alpha.locator(".tavernary-companion-project-card__kind").hover();
  await expectOwnedOverlay(
    page.getByRole("tooltip", { name: "Memory & Retrieval Extension" }),
    owner,
  );

  const install = alpha.getByRole("button", { name: "Install Alpha" });
  await install.hover();
  await expectOwnedOverlay(page.getByRole("tooltip", { name: "Install" }), owner);

  const kit = alpha.getByRole("button", { name: "Add Alpha to Kit" });
  await kit.hover();
  await expectOwnedOverlay(page.getByRole("tooltip", { name: "Add to Kit" }), owner);
  await kit.click();
  const removeFromKit = alpha.getByRole("button", { name: "Remove Alpha from selection" });
  await page.getByRole("button", { name: "Refresh catalog" }).hover();
  await removeFromKit.hover();
  await expectOwnedOverlay(page.getByRole("tooltip", { name: "Remove from selection" }), owner);

  const scan = alpha.getByRole("button", { name: /^TavernKeeper scan:/u });
  await scan.scrollIntoViewIfNeeded();
  await scan.hover();
  const scanPanel = page.getByRole("dialog", { name: "TavernKeeper Scan Results" });
  await expectOwnedOverlay(scanPanel, owner);
  expect(await isTopmostAtCenter(scanPanel)).toBe(true);
  await page.keyboard.press("Escape");

  await page
    .getByRole("navigation", { name: "Catalog categories" })
    .getByRole("button", { name: "Installed" })
    .click();
  const uninstall = page.getByRole("button", { name: "Uninstall Writer Tool" });
  await uninstall.hover();
  await expectOwnedOverlay(page.getByRole("tooltip", { name: "Uninstall" }), owner);
});

test("native popup opens and closes the mobile scan panel by tap", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await openHarness(page);
    const owner = await promoteHarnessToNativeModal(page);
    const scan = page
      .locator('.tavernary-companion-project-card[data-project-id="alpha"]')
      .getByRole("button", { name: /^TavernKeeper scan:/u });

    await scan.tap();
    const scanPanel = page.getByRole("dialog", { name: "TavernKeeper Scan Results" });
    await expectOwnedOverlay(scanPanel, owner);
    expect(await isTopmostAtCenter(scanPanel)).toBe(true);

    await scan.tap();
    await expect(scanPanel).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("card body and title open the repository while nested controls keep their own hit targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page.evaluate(() => {
    (window as typeof window & { companionRepositoryClicks: number }).companionRepositoryClicks = 0;
    window.open = () => {
      (window as typeof window & { companionRepositoryClicks: number }).companionRepositoryClicks +=
        1;
      return null;
    };
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const source = target.closest(".tavernary-companion-project-card__hitarea");
        if (!source) return;
        event.preventDefault();
        (
          window as typeof window & { companionRepositoryClicks: number }
        ).companionRepositoryClicks += 1;
      },
      true,
    );
  });

  const card = page.locator('.tavernary-companion-project-card[data-project-id="alpha"]');
  const source = card.getByRole("link", { name: "Open Alpha repository" });
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(source).toHaveAttribute("rel", /noopener/u);

  for (const [surface, expectedTag] of [
    [card.locator(".tavernary-companion-project-card__summary"), "A"],
    [card.getByRole("heading", { name: "Alpha" }), "SPAN"],
  ] as const) {
    const hit = await hitTarget(page, surface);
    expect(hit.tagName).toBe(expectedTag);
    if (expectedTag === "A") {
      expect(hit.className).toContain("tavernary-companion-project-card__hitarea");
    } else {
      expect(hit.className).toContain("tavernary-companion-tooltip-anchor");
    }
    expect(hit.cursor).toBe("pointer");
    await page.mouse.click(hit.x, hit.y);
  }
  expect(await repositoryClicks(page)).toBe(2);

  const install = card.getByRole("button", { name: "Install Alpha" });
  const installHit = await hitTarget(page, install);
  expect(installHit.cursor).toBe("pointer");
  await page.mouse.click(installHit.x, installHit.y);
  expect(await repositoryClicks(page)).toBe(2);
  await expect(
    page.getByRole("dialog", { name: "Third-party extension disclosure" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  const kit = card.getByRole("button", { name: "Add Alpha to Kit" });
  const kitHit = await hitTarget(page, kit);
  expect(kitHit.cursor).toBe("pointer");
  await page.mouse.click(kitHit.x, kitHit.y);
  expect(await repositoryClicks(page)).toBe(2);
  await expect(card.getByRole("button", { name: "Remove Alpha from selection" })).toBeVisible();

  const scan = card.locator(".tavernary-companion-tavernkeeper-trigger");
  if (await scan.count()) {
    const scanHit = await hitTarget(page, scan);
    expect(scanHit.cursor).toBe("pointer");
    await page.mouse.click(scanHit.x, scanHit.y);
    expect(await repositoryClicks(page)).toBe(2);
    await expect(page.getByRole("dialog", { name: "TavernKeeper Scan Results" })).toBeVisible();
  }
});

async function hitTarget(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const target = await page.evaluate(
    ({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
        throw new Error("No card hit target at the requested point.");
      }
      return {
        tagName: element.tagName,
        className: element.getAttribute("class") ?? "",
        cursor: getComputedStyle(element).cursor,
      };
    },
    { x, y },
  );
  return { ...target, x, y };
}

function repositoryClicks(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as typeof window & { companionRepositoryClicks: number }).companionRepositoryClicks,
  );
}

async function promoteHarnessToNativeModal(page: Page): Promise<Locator> {
  await page.evaluate(() => {
    const root = document.querySelector(".tavernary-companion-root");
    if (!root) throw new Error("Companion root was not found.");
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
  return page.locator("dialog.popup");
}

async function expectOwnedOverlay(overlay: Locator, owner: Locator): Promise<void> {
  await expect(overlay).toBeVisible();
  const ownerElement = await owner.elementHandle();
  await expect
    .poll(() =>
      overlay.evaluate(
        (element, expectedOwner) => element.parentElement === expectedOwner,
        ownerElement,
      ),
    )
    .toBe(true);
}

async function isTopmostAtCenter(overlay: Locator): Promise<boolean> {
  return overlay.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    );
    return hit !== null && element.contains(hit);
  });
}
