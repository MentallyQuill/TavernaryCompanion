import { describe, expect, it, vi } from "vitest";

import { createDiscoveryController } from "../../src/catalog/discovery-controller";
import {
  createCatalogSearchIndex,
  type CatalogSearchDocument,
} from "../../src/catalog/catalog-core";
import type { InventorySnapshot } from "../../src/inventory/inventory-types";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";

const inventory: InventorySnapshot = {
  managed: [],
  external: [],
  unknown: [],
  missingManaged: [],
};

function snapshot() {
  const catalog = catalogFixture();
  const zeta = catalogProjectFixture({ id: "zeta-extension" });
  const alpha = catalogProjectFixture({
    id: "alpha-preset",
    kind: "preset",
    folderName: null,
  });
  const risu = catalogProjectFixture({
    id: "risu-extension",
    frontend: "risuai",
  });
  zeta.activity.latestSourceActivityAt = "2026-08-17T00:00:00.000Z";
  alpha.activity.latestSourceActivityAt = "2026-08-16T00:00:00.000Z";
  risu.activity.latestSourceActivityAt = "2026-08-18T00:00:00.000Z";
  catalog.projects = [zeta, alpha, risu];
  return {
    state: "ready-current" as const,
    canMutate: true as const,
    checkedAt: null,
    catalog,
  };
}

describe("DiscoveryController", () => {
  it("starts with visible SillyTavern extension and preset defaults", () => {
    const controller = createDiscoveryController({ snapshot: snapshot(), inventory });

    expect(controller.read().query).toMatchObject({
      frontends: ["sillytavern"],
      kinds: ["extension", "preset"],
    });
    expect(controller.read().projects.map(({ id }) => id)).toEqual([
      "zeta-extension",
      "alpha-preset",
    ]);
  });

  it("lets users clear defaults and browse every frontend", () => {
    const controller = createDiscoveryController({ snapshot: snapshot(), inventory });
    controller.setQuery({ ...controller.read().query, frontends: [], kinds: [] });

    expect(controller.read().projects.map(({ id }) => id)).toEqual([
      "risu-extension",
      "zeta-extension",
      "alpha-preset",
    ]);
    expect(controller.read().facets?.frontends).toEqual([
      { id: "risuai", label: "risuai" },
      { id: "sillytavern", label: "sillytavern" },
    ]);
  });

  it("preserves literal search input and does not rebuild the index for inventory", () => {
    const createIndex = vi.fn((documents: CatalogSearchDocument[]) =>
      createCatalogSearchIndex(documents),
    );
    const controller = createDiscoveryController({
      snapshot: snapshot(),
      inventory,
      createIndex,
    });
    controller.setQuery({ ...controller.read().query, search: "Zeta + Alpha" });
    expect(controller.read().query.search).toBe("Zeta + Alpha");
    expect(createIndex).toHaveBeenCalledTimes(1);

    controller.setInventory({ ...inventory, unknown: [] });
    expect(createIndex).toHaveBeenCalledTimes(1);
  });

  it("keeps catalog order stable when installed annotations change", () => {
    const current = snapshot();
    const controller = createDiscoveryController({ snapshot: current, inventory });
    const before = controller.read().projects.map(({ id }) => id);
    const project = current.catalog.projects[0];
    controller.setInventory({
      ...inventory,
      external: [
        {
          project,
          extension: {
            internalName: "third-party/Zeta",
            folderName: project.install?.folderName ?? "",
            enabled: true,
            type: "local",
            manifest: null,
          },
        },
      ],
    });

    expect(controller.read().projects.map(({ id }) => id)).toEqual(before);
    expect(controller.read().projects[0]?.action.kind).toBe("uninstall");
  });
});
