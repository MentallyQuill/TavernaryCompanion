import { expect, it } from "vitest";
import type { ManagedExtensionMap } from "../../src/inventory/inventory-types";
import { planKitOperation } from "../../src/kits/kit-planner";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { approve, executorFixture, extension } from "../helpers/kit-executor-fixture";

it("activates, switches, and reference-uninstalls Kits without touching shared members", async () => {
  const shared = catalogProjectFixture({ id: "shared", folderName: "Shared" });
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const catalog = { ...catalogFixture(), projects: [shared, alpha] };
  const app = await executorFixture(catalog, {
    extensions: [extension("Shared"), extension("Alpha")],
  });
  const managed: ManagedExtensionMap = {
    shared: {
      projectId: "shared",
      internalName: "third-party/Shared",
      folderName: "Shared",
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "kit",
    },
    alpha: {
      projectId: "alpha",
      internalName: "third-party/Alpha",
      folderName: "Alpha",
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "kit",
    },
  };
  await app.profile.update((draft) => {
    draft.managedExtensions = managed;
  });
  await app.recordInstalled("kit-a", ["shared", "alpha"]);
  await app.recordInstalled("kit-b", ["shared"]);
  await app.kits.setActive("kit-b");
  const plan = planKitOperation({
    operation: "uninstall",
    kit: { id: "kit-a", projectIds: ["shared", "alpha"], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed,
    installedKits: app.kits.readInstalledStates(),
    activeKitId: "kit-b",
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  const receipt = await app.executor.execute(plan, approve(plan));
  expect(receipt.keptForOtherKits).toContain("shared");
  expect(app.kits.readActiveId()).toBe("kit-b");
  expect(app.host.calls.filter(({ operation }) => operation === "remove")).toEqual([
    expect.objectContaining({ internalName: "third-party/Alpha" }),
  ]);
});
