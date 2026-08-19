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

test("desktop category title ink stays optically centered with its icon", async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 720 });
  await openHarness(page);

  const navigation = page.getByRole("navigation", { name: "Catalog categories" });
  await expect(navigation).toBeVisible();

  const misalignedCategories = await navigation.getByRole("button").evaluateAll((buttons) =>
    buttons.flatMap((button) => {
      const icon = button.querySelector("svg, .tavernary-companion-all-symbol");
      const label = button.querySelector("span:last-child");
      if (!(icon instanceof HTMLElement || icon instanceof SVGGraphicsElement)) return [];
      if (!(label instanceof HTMLElement)) return [];

      const textRange = document.createRange();
      textRange.selectNodeContents(label);
      const textLines = Array.from(textRange.getClientRects());
      const firstLine = textLines[0];
      const lastLine = textLines.at(-1);
      if (!firstLine || !lastLine) return [];
      const textCenter = (firstLine.top + lastLine.bottom) / 2;

      let iconCenter: number;
      if (icon instanceof SVGGraphicsElement) {
        const artwork = icon.getBBox();
        const matrix = icon.getScreenCTM();
        if (!matrix) return [];
        const artworkTop = new DOMPoint(artwork.x, artwork.y).matrixTransform(matrix).y;
        const artworkBottom = new DOMPoint(
          artwork.x + artwork.width,
          artwork.y + artwork.height,
        ).matrixTransform(matrix).y;
        iconCenter = (artworkTop + artworkBottom) / 2;
      } else {
        const iconBounds = icon.getBoundingClientRect();
        iconCenter = (iconBounds.top + iconBounds.bottom) / 2;
      }

      const offset = Math.abs(iconCenter - textCenter);
      return offset <= 0.5
        ? []
        : [
            {
              category: button.dataset.category ?? label.textContent ?? "unknown",
              offset,
            },
          ];
    }),
  );

  expect(misalignedCategories).toEqual([]);
});
