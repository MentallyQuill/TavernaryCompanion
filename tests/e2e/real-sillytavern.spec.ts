import { expect, test, type Locator, type Page } from "@playwright/test";

const realHostUrl = process.env.REAL_SILLYTAVERN_URL;
const realHostUser = process.env.REAL_SILLYTAVERN_USER ?? "companion-acceptance-v1";

test.describe("real SillyTavern acceptance", () => {
  test.skip(!realHostUrl, "Set REAL_SILLYTAVERN_URL to run against an installed extension.");

  test("playtests the installed Companion overlay and card hit targets", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await openInstalledCompanion(page);

    const root = page.locator("[data-tavernary-companion-popup]");
    const dialog = page.locator("dialog.popup").filter({ has: root });
    const close = dialog.locator(":scope > .popup-button-close");
    await expect(root).toBeVisible();
    await expect(close).toBeVisible();
    await expect(close).toHaveCSS("font-family", /Font Awesome/u);
    const backdrop = await dialog.evaluate((element) => {
      const styles = getComputedStyle(element, "::backdrop");
      return { background: styles.backgroundColor, filter: styles.backdropFilter };
    });
    expect(backdrop.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(backdrop.filter).toContain("blur");

    const card = page.locator(".tavernary-companion-project-card").first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    const summary = card.locator(".tavernary-companion-project-card__summary");
    const hit = await hitTarget(page, summary);
    expect(hit.tagName).toBe("A");
    expect(hit.className).toContain("tavernary-companion-project-card__hitarea");
    expect(hit.cursor).toBe("pointer");
    await page.evaluate(() => {
      (window as typeof window & { realHostRepositoryClicks: number }).realHostRepositoryClicks = 0;
      document.addEventListener(
        "click",
        (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (!target.closest(".tavernary-companion-project-card__hitarea")) return;
          event.preventDefault();
          (
            window as typeof window & { realHostRepositoryClicks: number }
          ).realHostRepositoryClicks += 1;
        },
        true,
      );
    });
    await page.mouse.click(hit.x, hit.y);
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { realHostRepositoryClicks: number }).realHostRepositoryClicks,
      ),
    ).toBe(1);

    const navigation = root.getByRole("navigation", { name: "Catalog categories" });
    await navigation.getByRole("button", { name: "Kits" }).click();
    await expect(root.getByRole("tab", { name: /Personal/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await root.getByRole("tab", { name: /Published/u }).click();
    await expect(root.getByRole("complementary", { name: "Kit filters" })).toBeVisible();
    await expect(
      root.getByRole("group", { name: "Includes project" }).getByRole("radio").first(),
    ).toBeVisible();

    await navigation.getByRole("button", { name: "Installed" }).click();
    await expect(root.locator(".tavernary-companion-installed-card").first()).toBeVisible();
    const toggle = root.getByRole("switch").first();
    if (await toggle.count()) {
      const initial = await toggle.getAttribute("aria-checked");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", initial === "true" ? "false" : "true");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", initial ?? "false");
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(async () => await close.evaluate((element) => element.getBoundingClientRect().right))
      .toBeLessThanOrEqual(390);
    const rootBox = await root.boundingBox();
    const closeBox = await close.boundingBox();
    expect(rootBox).not.toBeNull();
    expect(closeBox).not.toBeNull();
    expect(rootBox!.y).toBeGreaterThanOrEqual(52);
    expect(closeBox!.x).toBeGreaterThanOrEqual(0);
    expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(390);
    expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(rootBox!.y - 4);

    await page.mouse.click(8, 8);
    await expect(root).toBeHidden();
  });
});

async function openInstalledCompanion(page: Page): Promise<void> {
  await page.goto(realHostUrl!, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() =>
    Boolean(
      document.querySelector(".userSelect") ??
      document.querySelector("[data-tavernary-companion-launcher]"),
    ),
  );
  const account = page.locator(".userSelect").filter({ hasText: realHostUser });
  if (await account.count()) await account.click();
  await page.locator("[data-tavernary-companion-launcher]").waitFor({ state: "attached" });
  const onboarding = page.locator("dialog .popup-input");
  if (await onboarding.isVisible()) {
    await onboarding.fill("Companion QA");
    await page.locator("dialog .popup-button-ok").click();
  }
  await page.locator("#extensions-settings-button .drawer-toggle").click();
  await page.locator("[data-tavernary-companion-launcher]").click();
}

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
