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
    expect(view.attributionLabel).toBe("by tavernary-author, plus 1 contributor");
    expect(view.activity.weeklyActivity).toEqual(project.activity.weeklyActivity);
    expect(view.activity.evidenceStatus).toBe("complete");
    expect(view.activity.latestSourceActivityLabel).toBe("1d ago");
    expect(view.activity.latestSourceActivityFreshness).toBeCloseTo(96.67, 1);
    expect(view.communityAggregate).toBe(11);
    expect(view.repositorySizeLabel).toBe("2.0 MB repo");
    expect(view.tooltips).toEqual({
      type: "Memory & Retrieval Extension",
      activity: "Source activity in 1 of the last 12 weeks",
      latestSourceActivity: "Last source activity Aug 18, 2026 (1d ago)",
      community: "11 total: 8 stars, 2 forks, 1 watchers",
      repositorySize: "2.0 MB repository",
      attribution: "GitHub owner: tavernary-author",
      license: "MIT is OSI-approved",
      frontends: ["sillytavern"],
      tags: ["Memory tools"],
      preset: null,
    });
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
    expect(view.tooltips.preset).toEqual({
      version: "Preset version v1.2.0",
      published: "Published Aug 18, 2026",
      size: "2 KB file",
      modelFamilies: ["Any model"],
      completionFormats: ["Chat completion"],
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

  it("makes only direct-removal inventory rows eligible for bulk selection", () => {
    const project = catalogProjectFixture();
    const local = {
      internalName: "third-party/Alpha",
      folderName: "Alpha",
      enabled: true,
      type: "local" as const,
      manifest: null,
    };
    const sections = toInstalledSectionViewModel({
      ...emptyInventory,
      external: [{ project, extension: local }],
      unknown: [
        {
          extension: { ...local, internalName: "third-party/Unknown", folderName: "Unknown" },
          reason: "folder-not-in-catalog",
        },
      ],
    });

    expect(sections.find(({ id }) => id === "external")?.rows[0]).toMatchObject({
      selectionEligible: true,
      selectionDisabledReason: null,
    });
    expect(sections.find(({ id }) => id === "unknown")?.rows[0]).toMatchObject({
      selectionEligible: false,
      selectionDisabledReason: "No unambiguous Tavernary project identity.",
    });
  });

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

  it("distinguishes ambiguous catalog matches from extensions absent from the catalog", () => {
    const extension = {
      internalName: "third-party/Shared",
      folderName: "Shared",
      enabled: true,
      type: "local" as const,
      manifest: { display_name: "Shared extension" },
    };
    const sections = toInstalledSectionViewModel({
      ...emptyInventory,
      unknown: [
        { extension, reason: "ambiguous-folder" },
        {
          extension: {
            ...extension,
            internalName: "third-party/Absent",
            folderName: "Absent",
          },
          reason: "folder-not-in-catalog",
        },
      ],
    });

    expect(sections.find(({ id }) => id === "ambiguous")).toMatchObject({
      title: "Multiple matches in current catalog",
      rows: [{ name: "Shared extension" }],
    });
    expect(sections.find(({ id }) => id === "unknown")).toMatchObject({
      title: "Not found in current catalog",
      rows: [{ name: "Shared extension" }],
    });
  });

  it("keeps missing management bookkeeping out of the installed user interface", () => {
    const project = catalogProjectFixture({ id: "story-engine", folderName: "Story-Engine" });
    const sections = toInstalledSectionViewModel({
      ...emptyInventory,
      missingManaged: [
        {
          project,
          record: {
            projectId: project.id,
            internalName: "third-party/Story-Engine",
            folderName: "Story-Engine",
            installedAt: "2026-08-19T16:03:54.690Z",
            installedBy: "individual",
          },
        },
      ],
    });

    expect(sections.map(({ id }) => id)).not.toContain("attention");
    expect(sections.map(({ title }) => title)).not.toContain("Previously managed");
  });
});
