// @vitest-environment node

import { readFile } from "node:fs/promises";

import { expect, it } from "vitest";

it("builds the exact files declared by the extension manifest without remote imports", async () => {
  const { buildExtension } = await import("../../scripts/build.mjs");

  await buildExtension({ root: process.cwd() });

  const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
  const javascript = await readFile(manifest.js, "utf8");
  const stylesheet = await readFile(manifest.css, "utf8");
  const trihex = await readFile("dist/assets/tavernary-trihex.png");
  const interLatin = await readFile("dist/assets/inter-latin-wght-normal.woff2");
  const interLatinExt = await readFile("dist/assets/inter-latin-ext-wght-normal.woff2");

  expect(javascript).toContain("tavernaryCompanionOnInstall");
  expect(javascript).not.toMatch(/from\s+["']https?:\/\//u);
  expect(stylesheet).toContain("--tavernary-companion-surface");
  expect(stylesheet).toContain("./assets/tavernary-trihex.png");
  expect(stylesheet).toContain("./assets/inter-latin-wght-normal.woff2");
  expect(stylesheet).toContain("./assets/inter-latin-ext-wght-normal.woff2");
  expect(trihex.byteLength).toBeGreaterThan(10_000);
  expect(interLatin.byteLength).toBeGreaterThan(40_000);
  expect(interLatinExt.byteLength).toBeGreaterThan(80_000);
});
