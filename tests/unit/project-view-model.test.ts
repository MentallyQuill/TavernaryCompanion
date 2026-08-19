import { describe, expect, it } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import { toProjectCardViewModel } from "../../src/catalog/project-view-model";
import { toInstalledSectionViewModel } from "../../src/catalog/installed-view-model";
import type { InventorySnapshot } from "../../src/inventory/inventory-types";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";

const emptyInventory: InventorySnapshot = {
  managed: [],
  external: [],
  unknown: [],
  missingManaged: [],
};

function readySnapshot(canMutate = true): CatalogSnapshot {
  const catalog = catalogFixture();
  return canMutate
    ? { state: "ready-current", canMutate: true, checkedAt: null, catalog }
    : {
        state: "incompatible-with-cache",
        canMutate: false,
        checkedAt: null,
        catalog,
        remoteSchemaVersion: 8,
      };
}

describe("project view models", () => {
  it("projects Tavernary card evidence and metadata", () => {
    const project = catalogProjectFixture();
    project.name = "SillyTavern Alpha";
    project.primaryFunction = "memory-retrieval";
    project.tags = [{ id: "memory", label: "Memory", description: "Memory tools", facet: "goal" }];
    project.activity.weeklyActivity = [
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
    ];
    project.attribution = {
      owner: { provider: "github", login: "tavernary-author" },
      contributors: [],
      humanContributorCount: 1,
      status: "current",
    };
    project.community = { stars: 8, forks: 2, watchers: 1, aggregate: 11 };
    project.repositorySizeKb = 2048;
    const view = toProjectCardViewModel(project, {
      snapshot: readySnapshot(),
      inventory: emptyInventory,
      now: "2026-08-19T00:00:00.000Z",
    });

    expect(view.displayName).toBe("Alpha");
    expect(view.canonicalUrl).toBe(project.canonicalUrl);
    expect(view.primaryFunctionId).toBe("memory-retrieval");
    expect(view.tagChips).toEqual([{ label: "Memory", facet: "goal" }]);
    expect(view.licenseLabel).toBe("MIT");
    expect(view.licenseStatus).toBe("osi-approved");
    expect(view.attributionLabel).toBe("by tavernary-author");
    expect(view.activity.weeklyActivity).toEqual(project.activity.weeklyActivity);
    expect(view.activity.evidenceStatus).toBe("complete");
    expect(view.activity.latestSourceActivityLabel).toBe("1d ago");
    expect(view.activity.latestSourceActivityFreshness).toBeCloseTo(96.67, 1);
    expect(view.communityAggregate).toBe(11);
    expect(view.repositorySizeLabel).toBe("2.0 MB repo");
  });

  it("projects Tavernary preset development and compatibility metadata", () => {
    const project = catalogProjectFixture({ kind: "preset", folderName: null });
    project.primaryFunction = "preset";
    project.preset = {
      version: "1.2.0",
      publishedAt: "2026-08-18T00:00:00.000Z",
      artifactSizeBytes: 2048,
      modelFamilies: [{ id: "model-agnostic", label: "Model-Agnostic", description: "Any model" }],
      completionFormats: [
        { id: "chat-completion", label: "Chat Completion", description: "Chat completion" },
      ],
    };

    const view = toProjectCardViewModel(project, {
      snapshot: readySnapshot(),
      inventory: emptyInventory,
      now: "2026-08-19T00:00:00.000Z",
    });

    expect(view.preset).toEqual({
      versionLabel: "v1.2.0",
      publishedLabel: "Published 1d ago",
      sizeLabel: "2 KB file",
      modelFamilies: ["Model-Agnostic"],
      completionFormats: ["Chat Completion"],
    });
  });

  it("treats missing activity evidence status as degraded", () => {
    const project = catalogProjectFixture();
    project.activity.evidenceStatus = null;

    const view = toProjectCardViewModel(project, {
      snapshot: readySnapshot(),
      inventory: emptyInventory,
    });

    expect(view.activity.evidenceStatus).toBe("degraded");
  });

  it.each([
    ["preset", "Preset installation is not available in V1"],
    ["frontend", "Browse-only in Companion"],
  ] as const)("makes a %s browse-only", (kind, reason) => {
    const project = catalogProjectFixture({ kind, folderName: null });
    expect(
      toProjectCardViewModel(project, {
        snapshot: readySnapshot(),
        inventory: emptyInventory,
      }).action,
    ).toEqual({ kind: "view-project", label: "View project", reason });
  });

  it("makes other-frontend extensions browse-only", () => {
    const project = catalogProjectFixture({ frontend: "risuai" });
    expect(
      toProjectCardViewModel(project, {
        snapshot: readySnapshot(),
        inventory: emptyInventory,
      }).action,
    ).toEqual({
      kind: "view-project",
      label: "View project",
      reason: "Browse-only in Companion",
    });
  });

  it("offers install only for an eligible absent SillyTavern extension", () => {
    const project = catalogProjectFixture();
    expect(
      toProjectCardViewModel(project, {
        snapshot: readySnapshot(),
        inventory: emptyInventory,
      }).action,
    ).toEqual({ kind: "install", label: "Install", reason: null });
  });

  it("explains a missing install contract without guessing a URL", () => {
    const project = catalogProjectFixture({ folderName: null });
    expect(
      toProjectCardViewModel(project, {
        snapshot: readySnapshot(),
        inventory: emptyInventory,
      }).action,
    ).toEqual({
      kind: "view-project",
      label: "View project",
      reason: "Install contract unavailable",
    });
  });

  it.each(["managed", "external"] as const)(
    "offers explicit uninstall for an installed %s project",
    (ownership) => {
      const project = catalogProjectFixture();
      const extension = {
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        enabled: true,
        type: "local" as const,
        manifest: null,
      };
      const inventory: InventorySnapshot = {
        ...emptyInventory,
        [ownership]: [
          ownership === "managed"
            ? {
                project,
                extension,
                record: {
                  projectId: project.id,
                  internalName: extension.internalName,
                  folderName: extension.folderName,
                  installedAt: "2026-08-18T00:00:00.000Z",
                  installedBy: "individual" as const,
                },
              }
            : { project, extension },
        ],
      };

      expect(
        toProjectCardViewModel(project, { snapshot: readySnapshot(), inventory }).action,
      ).toMatchObject({ kind: "uninstall", label: "Uninstall" });
    },
  );

  it.each(["managed", "external"] as const)(
    "sends a global %s installation to SillyTavern management",
    (ownership) => {
      const project = catalogProjectFixture();
      const extension = {
        internalName: "third-party/Alpha",
        folderName: "Alpha",
        enabled: true,
        type: "global" as const,
        manifest: null,
      };
      const inventory: InventorySnapshot = {
        ...emptyInventory,
        [ownership]: [
          ownership === "managed"
            ? {
                project,
                extension,
                record: {
                  projectId: project.id,
                  internalName: extension.internalName,
                  folderName: extension.folderName,
                  installedAt: "2026-08-18T00:00:00.000Z",
                  installedBy: "individual" as const,
                },
              }
            : { project, extension },
        ],
      };

      expect(
        toProjectCardViewModel(project, { snapshot: readySnapshot(), inventory }).action,
      ).toEqual({
        kind: "manage-in-sillytavern",
        label: "Manage in SillyTavern",
        reason: "Global extensions are managed by SillyTavern.",
      });
      expect(
        toInstalledSectionViewModel(inventory).find(({ id }) => id === ownership)?.rows[0]?.action,
      ).toMatchObject({ kind: "manage-in-sillytavern", label: "Manage in SillyTavern" });
    },
  );

  it("makes Companion and incompatible-schema actions non-mutating", () => {
    const self = catalogProjectFixture({
      id: "mentallyquill-tavernary-companion",
      folderName: "TavernaryCompanion",
    });
    expect(
      toProjectCardViewModel(self, {
        snapshot: readySnapshot(),
        inventory: emptyInventory,
      }).action,
    ).toMatchObject({ kind: "current-extension", label: "Current extension" });

    expect(
      toProjectCardViewModel(catalogProjectFixture(), {
        snapshot: readySnapshot(false),
        inventory: emptyInventory,
      }).action,
    ).toMatchObject({ kind: "update-required", label: "Update Companion" });
  });

  it("sends unknown installations to SillyTavern management", () => {
    const sections = toInstalledSectionViewModel({
      ...emptyInventory,
      unknown: [
        {
          extension: {
            internalName: "third-party/Unknown",
            folderName: "Unknown",
            enabled: true,
            type: "local",
            manifest: null,
          },
          reason: "folder-not-in-catalog",
        },
      ],
    });

    expect(sections.find(({ id }) => id === "unknown")?.rows[0]).toMatchObject({
      internalName: "third-party/Unknown",
      toggleable: true,
      action: { kind: "manage-in-sillytavern", label: "Manage in SillyTavern" },
    });
  });
});
