import { expect, it, vi } from "vitest";

import type { ManagedExtensionMap } from "../../src/inventory/inventory-types";
import { planKitOperation } from "../../src/kits/kit-planner";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { approve, executorFixture, extension } from "../helpers/kit-executor-fixture";

it("deactivates managed members without removing repositories", async () => {
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
  await app.recordInstalled("kit", ["alpha"]);
  await app.kits.setActive("kit");
  const plan = planKitOperation({
    operation: "deactivate",
    kit: { id: "kit", projectIds: ["alpha"], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed,
    installedKits: app.kits.readInstalledStates(),
    activeKitId: "kit",
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  const receipt = await app.executor.execute(plan, approve(plan));
  expect(app.kits.readActiveId()).toBeNull();
  expect(app.host.calls.some(({ operation }) => operation === "remove")).toBe(false);
  expect(receipt.reloadRequired).toBe(true);
  expect(app.host.reloadCount).toBe(0);
  expect(app.profile.read().operationReceipt).toEqual(receipt);
  expect(app.executor.journal.read()).toBeNull();
});

it("keeps the active marker and records drift when disable does not take effect", async () => {
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
  await app.recordInstalled("kit", ["alpha"]);
  await app.kits.setActive("kit");
  vi.spyOn(app.host, "disable").mockResolvedValue(undefined);
  const plan = planKitOperation({
    operation: "deactivate",
    kit: { id: "kit", projectIds: ["alpha"], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed,
    installedKits: app.kits.readInstalledStates(),
    activeKitId: "kit",
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);

  const receipt = await app.executor.execute(plan, approve(plan));

  expect(receipt.outcome).toBe("partial");
  expect(receipt.projects).toMatchObject([
    { projectId: "alpha", action: "disable", status: "failed", retryable: true },
  ]);
  expect(app.kits.readActiveId()).toBe("kit");
  expect(app.kits.readInstalled("kit")).toMatchObject({ status: "drifted" });
});

it("keeps the active marker and records drift when disabled state cannot be verified", async () => {
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
  await app.recordInstalled("kit", ["alpha"]);
  await app.kits.setActive("kit");
  const plan = planKitOperation({
    operation: "deactivate",
    kit: { id: "kit", projectIds: ["alpha"], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed,
    installedKits: app.kits.readInstalledStates(),
    activeKitId: "kit",
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  vi.spyOn(app.host, "discover").mockRejectedValueOnce(new Error("discovery unavailable"));

  const receipt = await app.executor.execute(plan, approve(plan));

  expect(receipt.outcome).toBe("partial");
  expect(app.kits.readActiveId()).toBe("kit");
  expect(app.kits.readInstalled("kit")).toMatchObject({ status: "drifted" });
});
