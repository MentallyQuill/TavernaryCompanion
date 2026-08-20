import { describe, expect, it } from "vitest";

import {
  reconcileHostInventory,
  reconcileInventory,
} from "../../src/inventory/inventory-reconciler";
import type { ManagedExtensionMap } from "../../src/inventory/inventory-types";
import type { HostExtension } from "../../src/host/host-types";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";
import { createFakeHost } from "../helpers/fake-host";

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

  it("uses the installed repository origin to resolve an ambiguous folder contract", () => {
    const original = catalogProjectFixture({
      id: "lodactio-extension-summaryception",
      folderName: "Extension-Summaryception",
    });
    const fork = catalogProjectFixture({
      id: "vadash-extension-summaryception",
      folderName: "Extension-Summaryception",
    });
    original.install!.repositoryUrl = "https://github.com/Lodactio/Extension-Summaryception.git";
    fork.install!.repositoryUrl = "https://github.com/vadash/Extension-Summaryception.git";
    const extension = {
      ...hostExtension("Extension-Summaryception"),
      repositoryUrl: "https://GitHub.com/Lodactio/Extension-Summaryception/",
    } as HostExtension & { repositoryUrl: string };

    const snapshot = reconcileInventory({
      projects: [original, fork],
      hostExtensions: [extension],
      managed: {},
    });

    expect(snapshot.external).toEqual([
      expect.objectContaining({
        project: expect.objectContaining({ id: "lodactio-extension-summaryception" }),
      }),
    ]);
    expect(snapshot.unknown).toHaveLength(0);
  });

  it("reads repository origin only for ambiguous installed folders", async () => {
    const original = catalogProjectFixture({ id: "original", folderName: "Shared" });
    const fork = catalogProjectFixture({ id: "fork", folderName: "Shared" });
    original.install!.repositoryUrl = "https://github.com/example/original.git";
    fork.install!.repositoryUrl = "https://github.com/example/fork.git";
    const unique = catalogProjectFixture({ id: "unique", folderName: "Unique" });
    const extension = hostExtension("Shared");
    const host = createFakeHost({
      extensions: [extension, hostExtension("Unique")],
      repositoryUrls: {
        [`${extension.type}:${extension.internalName}`]: original.install!.repositoryUrl,
      },
    });

    const snapshot = await reconcileHostInventory({
      projects: [original, fork, unique],
      host,
      managed: {},
    });

    expect(snapshot.external.map(({ project }) => project.id)).toEqual(["original", "unique"]);
    expect(snapshot.unknown).toHaveLength(0);
    expect(
      host.calls.filter(({ operation }) => operation === "readExtensionRepositoryUrl"),
    ).toEqual([
      {
        operation: "readExtensionRepositoryUrl",
        internalName: extension.internalName,
        type: extension.type,
      },
    ]);
  });

  it("keeps a failed repository-origin lookup safely ambiguous", async () => {
    const original = catalogProjectFixture({ id: "original", folderName: "Shared" });
    const fork = catalogProjectFixture({ id: "fork", folderName: "Shared" });
    original.install!.repositoryUrl = "https://github.com/example/original.git";
    fork.install!.repositoryUrl = "https://github.com/example/fork.git";
    const host = createFakeHost({
      extensions: [hostExtension("Shared")],
      failures: { readExtensionRepositoryUrl: new Error("offline") },
    });

    const snapshot = await reconcileHostInventory({
      projects: [original, fork],
      host,
      managed: {},
    });

    expect(snapshot.external).toHaveLength(0);
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
