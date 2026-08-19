import { expect, test, type Locator, type Page } from "@playwright/test";

import { openHarness } from "./harness";

test("card body and title open the repository while nested controls keep their own hit targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHarness(page);
  await page.evaluate(() => {
    (window as typeof window & { companionRepositoryClicks: number }).companionRepositoryClicks = 0;
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

  for (const surface of [
    card.locator(".tavernary-companion-project-card__summary"),
    card.getByRole("heading", { name: "Alpha" }),
  ]) {
    const hit = await hitTarget(page, surface);
    expect(hit.tagName).toBe("A");
    expect(hit.className).toContain("tavernary-companion-project-card__hitarea");
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
