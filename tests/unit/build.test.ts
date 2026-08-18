// @vitest-environment node

import { readFile } from "node:fs/promises";

import { expect, it } from "vitest";

it("builds the exact files declared by the extension manifest without remote imports", async () => {
  const { buildExtension } = await import("../../scripts/build.mjs");

  await buildExtension({ root: process.cwd() });

  const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
  const javascript = await readFile(manifest.js, "utf8");
  const stylesheet = await readFile(manifest.css, "utf8");

  expect(javascript).toContain("tavernaryCompanionOnInstall");
  expect(javascript).not.toMatch(/from\s+["']https?:\/\//u);
  expect(stylesheet).toContain("--tavernary-companion-surface");
});
