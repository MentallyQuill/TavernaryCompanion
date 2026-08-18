import { describe, expect, it } from "vitest";

import { COMPANION_PROJECT_ID, ManagedRegistry } from "../../src/inventory/managed-registry";

describe("ManagedRegistry", () => {
  it("records only a verified rediscovered folder", () => {
    const registry = new ManagedRegistry();
    registry.recordInstalled({
      projectId: "alpha",
      expectedFolderName: "Alpha",
      extension: {
        internalName: "third-party/Alpha",
        folderName: "alpha",
        enabled: true,
        type: "local",
        manifest: null,
      },
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "kit",
    });

    expect(registry.read()).toEqual({
      alpha: expect.objectContaining({
        projectId: "alpha",
        folderName: "alpha",
        installedBy: "kit",
      }),
    });
  });

  it("rejects a mismatched folder and Companion self", () => {
    const registry = new ManagedRegistry();
    const input = {
      expectedFolderName: "Alpha",
      extension: {
        internalName: "third-party/Beta",
        folderName: "Beta",
        enabled: true,
        type: "local" as const,
        manifest: null,
      },
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "individual" as const,
    };

    expect(() => registry.recordInstalled({ ...input, projectId: "alpha" })).toThrow(
      "rediscovered folder",
    );
    expect(() =>
      registry.recordInstalled({
        ...input,
        projectId: COMPANION_PROJECT_ID,
        expectedFolderName: "Beta",
      }),
    ).toThrow("cannot manage itself");
  });

  it("discards a persisted self-ownership record", () => {
    const registry = new ManagedRegistry({
      [COMPANION_PROJECT_ID]: {
        projectId: COMPANION_PROJECT_ID,
        internalName: "third-party/TavernaryCompanion",
        folderName: "TavernaryCompanion",
        installedAt: "2026-08-18T00:00:00.000Z",
        installedBy: "individual",
      },
    });

    expect(registry.read()).toEqual({});
  });

  it("prunes absent records without adopting external extensions", () => {
    const registry = new ManagedRegistry({
      alpha: {
        projectId: "alpha",
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        installedAt: "2026-08-18T00:00:00.000Z",
        installedBy: "individual",
      },
    });

    expect(registry.pruneAbsent([])).toEqual(["alpha"]);
    expect(registry.read()).toEqual({});
  });
});
