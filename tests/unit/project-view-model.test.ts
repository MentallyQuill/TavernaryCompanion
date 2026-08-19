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
    const view = toProjectCardViewModel(project, {
      snapshot: readySnapshot(),
      inventory: emptyInventory,
    });

    expect(view.tags).toEqual(["Memory"]);
    expect(view.licenseLabel).toBe("MIT");
    expect(view.attributionLabel).toBe("By tavernary-author");
    expect(view.activity.weeklyActivity).toEqual(project.activity.weeklyActivity);
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
      action: { kind: "manage-in-sillytavern", label: "Manage in SillyTavern" },
    });
  });
});
