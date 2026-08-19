import { expect, test } from "@playwright/test";

import { openHarness } from "./harness";

test("desktop category labels stay inside their controls at compact widths", async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 720 });
  await openHarness(page);

  const navigation = page.getByRole("navigation", { name: "Catalog categories" });
  await expect(navigation).toBeVisible();

  const overflowingCategories = await navigation.getByRole("button").evaluateAll((buttons) =>
    buttons.flatMap((button) => {
      const label = button.querySelector("span:last-child");
      if (!(label instanceof HTMLElement)) return [];
      const controlBounds = button.getBoundingClientRect();
      const labelBounds = label.getBoundingClientRect();
      const fits =
        labelBounds.left >= controlBounds.left - 0.5 &&
        labelBounds.right <= controlBounds.right + 0.5 &&
        labelBounds.top >= controlBounds.top - 0.5 &&
        labelBounds.bottom <= controlBounds.bottom + 0.5;
      return fits
        ? []
        : [
            {
              category: button.dataset.category ?? label.textContent ?? "unknown",
              controlLeft: controlBounds.left,
              controlRight: controlBounds.right,
              labelLeft: labelBounds.left,
              labelRight: labelBounds.right,
            },
          ];
    }),
  );

  expect(overflowingCategories).toEqual([]);
  await expect(navigation).toHaveScreenshot("compact-category-navigation-980x720.png");
});
