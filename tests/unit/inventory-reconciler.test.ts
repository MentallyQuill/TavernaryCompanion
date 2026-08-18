import { describe, expect, it } from "vitest";

import { reconcileInventory } from "../../src/inventory/inventory-reconciler";
import type { ManagedExtensionMap } from "../../src/inventory/inventory-types";
import type { HostExtension } from "../../src/host/host-types";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";

function hostExtension(
  folderName: string,
  internalName = `third-party/${folderName}`,
): HostExtension {
  return {
    internalName,
    folderName,
    enabled: true,
    type: "local",
    manifest: { display_name: folderName },
  };
}

function managed(
  projectId: string,
  folderName: string,
  internalName = `third-party/${folderName}`,
): ManagedExtensionMap {
  return {
    [projectId]: {
      projectId,
      internalName,
      folderName,
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "individual",
    },
  };
}

describe("reconcileInventory", () => {
  it("matches only the validated installation folder identity", () => {
    const snapshot = reconcileInventory({
      projects: [catalogProjectFixture({ folderName: "Alpha" })],
      hostExtensions: [hostExtension("DifferentAlpha")],
      managed: {},
    });

    expect(snapshot.external).toHaveLength(0);
    expect(snapshot.unknown).toHaveLength(1);
  });

  it("matches folders case-insensitively without claiming ownership", () => {
    const snapshot = reconcileInventory({
      projects: [catalogProjectFixture({ folderName: "Alpha" })],
      hostExtensions: [hostExtension("alpha")],
      managed: {},
    });

    expect(snapshot.external).toEqual([
      expect.objectContaining({ project: expect.objectContaining({ id: "alpha" }) }),
    ]);
    expect(snapshot.managed).toHaveLength(0);
  });

  it("requires exact project ownership and reports stale manual deletion", () => {
    const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
    const beta = catalogProjectFixture({ id: "beta", folderName: "Beta" });
    const snapshot = reconcileInventory({
      projects: [alpha, beta],
      hostExtensions: [hostExtension("Beta")],
      managed: managed("alpha", "Alpha"),
    });

    expect(snapshot.managed).toHaveLength(0);
    expect(snapshot.external[0]?.project.id).toBe("beta");
    expect(snapshot.missingManaged).toEqual([
      expect.objectContaining({ record: expect.objectContaining({ projectId: "alpha" }) }),
    ]);
  });

  it("treats ambiguous folder contracts as unknown", () => {
    const snapshot = reconcileInventory({
      projects: [
        catalogProjectFixture({ id: "alpha", folderName: "Shared" }),
        catalogProjectFixture({ id: "beta", folderName: "shared" }),
      ],
      hostExtensions: [hostExtension("SHARED")],
      managed: {},
    });

    expect(snapshot.unknown).toEqual([expect.objectContaining({ reason: "ambiguous-folder" })]);
  });

  it("never places Companion self identity under managed ownership", () => {
    const id = "mentallyquill-tavernary-companion";
    const snapshot = reconcileInventory({
      projects: [catalogProjectFixture({ id, folderName: "TavernaryCompanion" })],
      hostExtensions: [hostExtension("TavernaryCompanion")],
      managed: managed(id, "TavernaryCompanion"),
    });

    expect(snapshot.managed).toHaveLength(0);
    expect(snapshot.external).toHaveLength(1);
    expect(snapshot.missingManaged).toHaveLength(0);
  });
});
