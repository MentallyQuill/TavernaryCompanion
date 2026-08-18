import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("ships portable Kit fields without a V2 submission surface", () => {
  const root = resolve(import.meta.dirname, "../..");
  const sourceFiles = [
    "src/kits/kit-types.ts",
    "src/kits/kit-portability.ts",
    "src/ui/kits/kits-route.tsx",
    "src/ui/kits/kit-inspector.tsx",
  ];
  const source = sourceFiles.map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");
  for (const forbidden of [
    "Submit to Tavernary",
    "GitHubSubmissionHandoff",
    "github_token",
    "issue-form",
  ]) {
    expect(source).not.toContain(forbidden);
  }
  expect(source).toContain("targetFrontend");
  expect(source).toContain("projectIds");
  expect(source).toContain("origin");
});
