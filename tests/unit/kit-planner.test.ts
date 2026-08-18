import { describe, expect, it } from "vitest";

import { planKitOperation } from "../../src/kits/kit-planner";
import type {
  InventorySnapshot,
  ManagedExtensionMap,
  ManagedExtensionRecord,
} from "../../src/inventory/inventory-types";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";

const emptyInventory: InventorySnapshot = {
  managed: [],
  external: [],
  unknown: [],
  missingManaged: [],
};

describe("Kit planner", () => {
  it("categorizes installs, managed members, external context, and a prior active Kit", () => {
    const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
    const beta = catalogProjectFixture({ id: "beta", folderName: "Beta" });
    const gamma = catalogProjectFixture({ id: "gamma", folderName: "Gamma" });
    const old = catalogProjectFixture({ id: "old-only", folderName: "Old" });
    const managed: ManagedExtensionMap = {
      alpha: record("alpha", "Alpha"),
      "old-only": record("old-only", "Old"),
    };
    const plan = planKitOperation({
      operation: "activate",
      kit: { id: "writers-kit", projectIds: ["alpha", "beta", "gamma"], origin: "personal" },
      catalog: { ...catalogFixture(), projects: [alpha, beta, gamma, old] },
      inventory: {
        ...emptyInventory,
        managed: [
          managedEntry(alpha, managed.alpha, true),
          managedEntry(old, managed["old-only"], true),
        ],
        external: [{ project: gamma, extension: extension("Gamma", true) }],
      },
      managed,
      installedKits: [installed("old-kit", ["old-only"])],
      activeKitId: "old-kit",
      catalogCanMutate: true,
    });
    expect(plan).toMatchObject({
      operation: "activate",
      kitId: "writers-kit",
      blockingIssues: [],
      install: [{ projectId: "beta" }],
      alreadyManaged: [{ projectId: "alpha" }],
      externalContext: [{ projectId: "gamma" }],
      enable: [{ projectId: "alpha" }, { projectId: "beta" }],
      disable: [{ projectId: "old-only" }],
      reloadRequired: true,
    });
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it("keeps shared members and never removes external context", () => {
    const shared = catalogProjectFixture({ id: "shared", folderName: "Shared" });
    const external = catalogProjectFixture({ id: "external", folderName: "External" });
    const managed = { shared: record("shared", "Shared") };
    const plan = planKitOperation({
      operation: "uninstall",
      kit: { id: "a", projectIds: ["shared", "external"], origin: "personal" },
      catalog: { ...catalogFixture(), projects: [shared, external] },
      inventory: {
        ...emptyInventory,
        managed: [managedEntry(shared, managed.shared, true)],
        external: [{ project: external, extension: extension("External", true) }],
      },
      managed,
      installedKits: [installed("a", ["shared", "external"]), installed("b", ["shared"])],
      activeKitId: null,
      catalogCanMutate: true,
    });
    expect(plan.remove).toEqual([]);
    expect(plan.keptForOtherKits.map(({ projectId }) => projectId)).toEqual(["shared"]);
    expect(plan.externalContext.map(({ projectId }) => projectId)).toEqual(["external"]);
  });

  it("blocks unavailable required extensions and incompatible catalogs", () => {
    const plan = planKitOperation({
      operation: "install",
      kit: { id: "broken", projectIds: ["missing"], origin: "personal" },
      catalog: catalogFixture(),
      inventory: emptyInventory,
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: false,
    });
    expect(plan.blockingIssues.map(({ code }) => code)).toEqual([
      "catalog-incompatible",
      "project-unavailable",
    ]);
  });
});

function extension(folderName: string, enabled: boolean) {
  return {
    internalName: `third-party/${folderName}`,
    folderName,
    enabled,
    type: "local" as const,
    manifest: null,
  };
}
function record(projectId: string, folderName: string): ManagedExtensionRecord {
  return {
    projectId,
    internalName: `third-party/${folderName}`,
    folderName,
    installedAt: "2026-08-18T00:00:00.000Z",
    installedBy: "kit" as const,
  };
}
function managedEntry(
  project: ReturnType<typeof catalogProjectFixture>,
  item: ReturnType<typeof record>,
  enabled: boolean,
) {
  return { project, record: item, extension: extension(item.folderName, enabled) };
}
function installed(kitId: string, installedProjectIds: string[]) {
  return {
    kitId,
    definitionFingerprint: "a".repeat(64),
    installedProjectIds,
    missingProjectIds: [],
    status: "installed" as const,
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  };
}
