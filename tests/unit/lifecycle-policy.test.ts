import { describe, expect, it } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import { evaluateLifecycle } from "../../src/lifecycle/lifecycle-policy";
import type { InventorySnapshot } from "../../src/inventory/inventory-types";
import { COMPANION_PROJECT_ID } from "../../src/lifecycle/self-protection";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";

const emptyInventory: InventorySnapshot = {
  managed: [],
  external: [],
  unknown: [],
  missingManaged: [],
};

function snapshot(canMutate = true): CatalogSnapshot {
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

describe("lifecycle policy", () => {
  it("rejects Companion self-management before every other check", () => {
    const project = catalogProjectFixture({ id: COMPANION_PROJECT_ID });
    expect(
      evaluateLifecycle({
        operation: "install",
        project,
        context: { snapshot: snapshot(false), inventory: emptyInventory },
      }),
    ).toEqual({ kind: "rejected", reason: "self-protected" });
  });

  it("rejects absent, incompatible, browse-only, and invalid install projects", () => {
    const context = { snapshot: snapshot(), inventory: emptyInventory };
    expect(evaluateLifecycle({ operation: "install", project: null, context })).toEqual({
      kind: "rejected",
      reason: "project-not-found",
    });
    expect(
      evaluateLifecycle({
        operation: "install",
        project: catalogProjectFixture(),
        context: { ...context, snapshot: snapshot(false) },
      }),
    ).toEqual({ kind: "rejected", reason: "catalog-incompatible" });
    expect(
      evaluateLifecycle({
        operation: "install",
        project: catalogProjectFixture({ kind: "preset", folderName: null }),
        context,
      }),
    ).toEqual({ kind: "rejected", reason: "browse-only-project" });
    const invalid = catalogProjectFixture();
    invalid.install = { ...invalid.install!, repositoryUrl: "https://user:pass@example.com/a.git" };
    expect(evaluateLifecycle({ operation: "install", project: invalid, context })).toEqual({
      kind: "rejected",
      reason: "invalid-install-contract",
    });
  });

  it("allows only an absent eligible extension with a revalidated contract", () => {
    const project = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
    expect(
      evaluateLifecycle({
        operation: "install",
        project,
        context: { snapshot: snapshot(), inventory: emptyInventory },
      }),
    ).toEqual({ kind: "allowed", operation: "install", contract: project.install });

    const inventory: InventorySnapshot = {
      ...emptyInventory,
      external: [
        {
          project,
          extension: {
            internalName: "third-party/Alpha",
            folderName: "Alpha",
            enabled: true,
            type: "local",
            manifest: null,
          },
        },
      ],
    };
    expect(
      evaluateLifecycle({
        operation: "install",
        project,
        context: { snapshot: snapshot(), inventory },
      }),
    ).toEqual({ kind: "rejected", reason: "already-installed" });
  });

  it("allows exact local removal and rejects missing or global targets", () => {
    const project = catalogProjectFixture({ id: "alpha" });
    const extension = {
      internalName: "third-party/Alpha",
      folderName: "Alpha",
      enabled: true,
      type: "local" as const,
      manifest: null,
    };
    const context = {
      snapshot: snapshot(),
      inventory: {
        ...emptyInventory,
        external: [{ project, extension }],
      },
    };
    expect(evaluateLifecycle({ operation: "remove", project, context })).toEqual({
      kind: "allowed",
      operation: "remove",
      extension,
      ownership: "external",
    });
    expect(
      evaluateLifecycle({
        operation: "remove",
        project,
        context: { ...context, inventory: emptyInventory },
      }),
    ).toEqual({ kind: "rejected", reason: "not-installed" });
    expect(
      evaluateLifecycle({
        operation: "remove",
        project,
        context: {
          ...context,
          inventory: {
            ...emptyInventory,
            external: [{ project, extension: { ...extension, type: "global" } }],
          },
        },
      }),
    ).toEqual({ kind: "rejected", reason: "host-non-removable" });
  });

  it("rejects while another lifecycle operation is active", () => {
    expect(
      evaluateLifecycle({
        operation: "install",
        project: catalogProjectFixture(),
        context: { snapshot: snapshot(), inventory: emptyInventory, operationInProgress: true },
      }),
    ).toEqual({ kind: "rejected", reason: "operation-in-progress" });
  });
});
