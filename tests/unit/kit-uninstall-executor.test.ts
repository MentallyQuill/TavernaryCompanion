import { expect, it, vi } from "vitest";

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

it("does not clear or remove an active Kit when deactivation cannot be verified", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const catalog = { ...catalogFixture(), projects: [alpha] };
  const app = await executorFixture(catalog, { extensions: [extension("Alpha")] });
  const managed: ManagedExtensionMap = {
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
  await app.recordInstalled("a", ["alpha"]);
  await app.kits.setActive("a");
  const plan = planKitOperation({
    operation: "uninstall",
    kit: { id: "a", projectIds: ["alpha"], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed,
    installedKits: app.kits.readInstalledStates(),
    activeKitId: "a",
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  vi.spyOn(app.host, "disable").mockResolvedValue(undefined);

  const receipt = await app.executor.execute(plan, approve(plan));

  expect(receipt.outcome).toBe("failed");
  expect(app.kits.readActiveId()).toBe("a");
  expect(app.kits.readInstalled("a")).toMatchObject({ status: "drifted" });
  expect(app.host.calls.some(({ operation }) => operation === "remove")).toBe(false);
});
