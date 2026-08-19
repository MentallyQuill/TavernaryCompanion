import { resolve, sep } from "node:path";

import type { Page } from "@playwright/test";

export async function openHarness(page: Page, scenario?: string): Promise<void> {
  const root = resolve(import.meta.dirname, "../..");
  const startupErrors: string[] = [];
  page.on("pageerror", (error) => startupErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") startupErrors.push(message.text());
  });
  await page.route("http://localhost/**", async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      await route.fulfill({ status: 403, body: "Forbidden" });
      return;
    }
    await route.fulfill({ path: target });
  });
  const query = scenario ? `?scenario=${encodeURIComponent(scenario)}` : "";
  await page.goto(`http://localhost/tests/fixtures/ui-harness.html${query}`);
  try {
    await page.getByTestId("companion-shell").waitFor({ timeout: 10_000 });
  } catch (error) {
    throw new Error(
      `Companion harness did not render${startupErrors.length ? `: ${startupErrors.join(" | ")}` : "."}`,
      { cause: error },
    );
  }
}
