import { describe, expect, it } from "vitest";

import { reconcileKitStatus } from "../../src/kits/kit-reconciler";
import type { InventorySnapshot } from "../../src/inventory/inventory-types";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";
import { extension } from "../helpers/kit-executor-fixture";

const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
const record = {
  projectId: "alpha",
  internalName: "third-party/Alpha",
  folderName: "Alpha",
  installedAt: "2026-08-18T00:00:00.000Z",
  installedBy: "kit" as const,
};
const installed = {
  kitId: "kit",
  definitionFingerprint: "a".repeat(64),
  definitionProjectIds: ["alpha"],
  installedProjectIds: ["alpha"],
  missingProjectIds: [],
  status: "installed" as const,
  installedAt: "2026-08-18T00:00:00.000Z",
  lastVerifiedAt: "2026-08-18T00:00:00.000Z",
};

describe("Kit reconciliation", () => {
  it("reports active only when managed enabled state matches", () => {
    expect(
      reconcileKitStatus({
        kitId: "kit",
        definitionFingerprint: "a".repeat(64),
        published: false,
        installed,
        inventory: inventory(true),
        activeKitId: "kit",
      }),
    ).toBe("active");
    expect(
      reconcileKitStatus({
        kitId: "kit",
        definitionFingerprint: "a".repeat(64),
        published: false,
        installed,
        inventory: inventory(false),
        activeKitId: "kit",
      }),
    ).toBe("drifted");
  });

  it("distinguishes changed published topology and missing members", () => {
    expect(
      reconcileKitStatus({
        kitId: "kit",
        definitionFingerprint: "b".repeat(64),
        published: true,
        installed,
        inventory: inventory(true),
        activeKitId: null,
      }),
    ).toBe("changedOnTavernary");
    expect(
      reconcileKitStatus({
        kitId: "kit",
        definitionFingerprint: "a".repeat(64),
        published: false,
        installed,
        inventory: {
          managed: [],
          external: [],
          unknown: [],
          missingManaged: [{ record, project: alpha }],
        },
        activeKitId: null,
      }),
    ).toBe("incomplete");
  });
});

function inventory(enabled: boolean): InventorySnapshot {
  return {
    managed: [{ project: alpha, record, extension: extension("Alpha", enabled) }],
    external: [],
    unknown: [],
    missingManaged: [],
  };
}
