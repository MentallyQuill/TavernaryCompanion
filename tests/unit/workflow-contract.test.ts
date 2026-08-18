import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
it("runs the complete read-only CI and release gates on Node 24", () => {
  const check = readFileSync(resolve(root, ".github/workflows/check.yml"), "utf8");
  const release = readFileSync(resolve(root, ".github/workflows/release-artifact.yml"), "utf8");
  for (const workflow of [check, release]) {
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run check");
    expect(workflow).toContain("npm run test:e2e");
  }
  expect(check).toContain("if: failure()");
  expect(release).toContain("npm run release:package");
  expect(release).toContain("npm run release:verify");
  expect(release.indexOf("npm run check")).toBeLessThan(release.indexOf("npm run release:package"));
});
