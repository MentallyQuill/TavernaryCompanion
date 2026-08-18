import { resolve, sep } from "node:path";

import type { Page } from "@playwright/test";

export async function openHarness(page: Page): Promise<void> {
  const root = resolve(import.meta.dirname, "../..");
  await page.route("http://companion.test/**", async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      await route.fulfill({ status: 403, body: "Forbidden" });
      return;
    }
    await route.fulfill({ path: target });
  });
  await page.goto("http://companion.test/tests/fixtures/ui-harness.html");
  await page.getByTestId("companion-shell").waitFor();
}
