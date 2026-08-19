import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { createReleasePackage } from "../../scripts/package-release.mjs";
import { verifyRelease } from "../../scripts/verify-release.mjs";

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
