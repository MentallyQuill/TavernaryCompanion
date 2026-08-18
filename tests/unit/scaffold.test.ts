import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("extension scaffold", () => {
  it("declares the production module and stylesheet SillyTavern must load", async () => {
    const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

    expect(manifest).toMatchObject({
      display_name: "Tavernary Companion",
      key: "tavernary-companion",
      js: "dist/extension.js",
      css: "dist/companion.css",
      minimum_client_version: "1.12.0",
      auto_update: false,
    });
  });

  it("exports every lifecycle hook named by the manifest", async () => {
    const extensionModule = await import("../../src/extension/index");

    expect([
      extensionModule.tavernaryCompanionOnInstall,
      extensionModule.tavernaryCompanionOnUpdate,
      extensionModule.tavernaryCompanionOnDelete,
      extensionModule.tavernaryCompanionOnClean,
      extensionModule.tavernaryCompanionOnEnable,
      extensionModule.tavernaryCompanionOnDisable,
      extensionModule.tavernaryCompanionOnActivate,
    ]).toEqual([
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    ]);
  });
});
