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
      enable: [{ projectId: "beta" }],
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

  it("produces a no-op when activating the already-active healthy Kit", () => {
    const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
    const managed = { alpha: record("alpha", "Alpha") };
    const plan = planKitOperation({
      operation: "activate",
      kit: { id: "kit", projectIds: ["alpha"], origin: "personal" },
      catalog: { ...catalogFixture(), projects: [alpha] },
      inventory: { ...emptyInventory, managed: [managedEntry(alpha, managed.alpha, true)] },
      managed,
      installedKits: [installed("kit", ["alpha"])],
      activeKitId: "kit",
      catalogCanMutate: true,
    });
    expect(plan.install).toEqual([]);
    expect(plan.enable).toEqual([]);
    expect(plan.disable).toEqual([]);
    expect(plan.reloadRequired).toBe(false);
  });

  it("warns only for projects that the plan will install", () => {
    const installedProject = flaggedProject("installed", "Installed");
    const newProject = flaggedProject("new", "New");
    const managed = { installed: record("installed", "Installed") };
    const input = {
      kit: {
        id: "kit",
        projectIds: ["installed", "new"],
        origin: "personal" as const,
      },
      catalog: { ...catalogFixture(), projects: [installedProject, newProject] },
      inventory: {
        ...emptyInventory,
        managed: [managedEntry(installedProject, managed.installed, true)],
      },
      managed,
      installedKits: [installed("kit", ["installed"])],
      activeKitId: null,
      catalogCanMutate: true,
    };

    expect(planKitOperation({ ...input, operation: "install" }).warnings).toMatchObject([
      { projectId: "new", severity: "material" },
    ]);
    expect(planKitOperation({ ...input, operation: "deactivate" }).warnings).toEqual([]);
    expect(planKitOperation({ ...input, operation: "uninstall" }).warnings).toEqual([]);
  });
});

function flaggedProject(id: string, folderName: string) {
  const project = catalogProjectFixture({ id, folderName });
  project.tavernKeeper = {
    state: "orange",
    freshness: "current",
    riskLevel: "material",
    currentSha: "a".repeat(40),
    history: [],
    historyUrl: null,
    report: {
      reportId: `report-${id}`,
      riskLevel: "material",
      headline: "Review this project",
      summary: "Potential concerns.",
      minorCautions: 0,
      materialConcerns: 1,
      highDanger: 0,
      maliciousEvidence: "",
      citedFindingIds: ["finding-1"],
      scannedSha: "a".repeat(40),
      treeUrl: `https://example.com/${id}/tree`,
      scannedAt: "2026-08-18T00:00:00.000Z",
      assessedAt: "2026-08-18T00:01:00.000Z",
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "fixture",
      dangerBasis: "none",
      assessmentSource: "model",
      reportUrl: `https://example.com/${id}/scan`,
      technicalHistoryUrl: null,
    },
  };
  return project;
}

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
    definitionProjectIds: installedProjectIds,
    installedProjectIds,
    missingProjectIds: [],
    status: "installed" as const,
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  };
}
