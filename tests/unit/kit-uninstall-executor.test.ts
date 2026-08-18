import { expect, it } from "vitest";

import type { ManagedExtensionMap } from "../../src/inventory/inventory-types";
import { planKitOperation } from "../../src/kits/kit-planner";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { approve, executorFixture, extension } from "../helpers/kit-executor-fixture";

it("keeps shared managed members and removes only the final-reference member", async () => {
  const shared = catalogProjectFixture({ id: "shared", folderName: "Shared" });
  const onlyA = catalogProjectFixture({ id: "only-a", folderName: "OnlyA" });
  const catalog = { ...catalogFixture(), projects: [shared, onlyA] };
  const app = await executorFixture(catalog, {
    extensions: [extension("Shared"), extension("OnlyA")],
  });
  const managed: ManagedExtensionMap = {
    shared: {
      projectId: "shared",
      internalName: "third-party/Shared",
      folderName: "Shared",
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "kit",
    },
    "only-a": {
      projectId: "only-a",
      internalName: "third-party/OnlyA",
      folderName: "OnlyA",
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "kit",
    },
  };
  await app.profile.update((draft) => {
    draft.managedExtensions = managed;
  });
  await app.recordInstalled("a", ["shared", "only-a"]);
  await app.recordInstalled("b", ["shared"]);
  const plan = planKitOperation({
    operation: "uninstall",
    kit: { id: "a", projectIds: ["shared", "only-a"], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed,
    installedKits: app.kits.readInstalledStates(),
    activeKitId: null,
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  const receipt = await app.executor.execute(plan, approve(plan));
  expect(receipt.keptForOtherKits).toEqual(["shared"]);
  expect(app.host.calls.filter(({ operation }) => operation === "remove")).toEqual([
    expect.objectContaining({ internalName: "third-party/OnlyA" }),
  ]);
  expect(app.kits.readInstalled("a")).toBeNull();
});
