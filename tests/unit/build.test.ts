// @vitest-environment node

import { mkdtempSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { createReleasePackage } from "../../scripts/package-release.mjs";
import { verifyRelease } from "../../scripts/verify-release.mjs";

describe.sequential("build and release packaging", () => {
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

  it("packages the deterministic installable files and Tavernary brand assets", () => {
    const root = resolve(import.meta.dirname, "../..");
    const first = mkdtempSync(resolve(tmpdir(), "companion-release-a-"));
    const second = mkdtempSync(resolve(tmpdir(), "companion-release-b-"));
    const sourceCommit = "a".repeat(40);
    const one = createReleasePackage({ root, outputDirectory: first, sourceCommit });
    const two = createReleasePackage({ root, outputDirectory: second, sourceCommit });
    expect(one.hashManifest.archiveSha256).toBe(two.hashManifest.archiveSha256);
    expect(readFileSync(one.archivePath)).toEqual(readFileSync(two.archivePath));
    expect(verifyRelease(one)).toMatchObject({
      entries: [
        "LICENSES/Inter-OFL-1.1.txt",
        "dist/assets/inter-latin-ext-wght-normal.woff2",
        "dist/assets/inter-latin-wght-normal.woff2",
        "dist/assets/tavernary-trihex.png",
        "dist/companion.css",
        "dist/extension.js",
        "manifest.json",
      ],
      sourceCommit,
    });
  });
});
