import { expect, it, vi } from "vitest";

import { reconcileInventory } from "../../src/inventory/inventory-reconciler";
import type { ManagedExtensionMap } from "../../src/inventory/inventory-types";
import { planKitOperation } from "../../src/kits/kit-planner";
import { catalogFixture, catalogProjectFixture, deferred } from "../helpers/catalog-fixtures";
import { approve, executorFixture, extension } from "../helpers/kit-executor-fixture";

it("commits activation state and returns reload work without navigating", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const old = catalogProjectFixture({ id: "old", folderName: "Old" });
  const catalog = { ...catalogFixture(), projects: [alpha, old] };
  const app = await executorFixture(catalog, {
    extensions: [extension("Old")],
    installResults: { [alpha.install!.repositoryUrl]: extension("Alpha", false) },
  });
  const managed: ManagedExtensionMap = {
    old: {
      projectId: "old",
      internalName: "third-party/Old",
      folderName: "Old",
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "kit",
    },
  };
  await app.profile.update((draft) => {
    draft.managedExtensions = managed;
  });
  await app.recordInstalled("old-kit", ["old"]);
  await app.kits.setActive("old-kit");
  const inventory = reconcileInventory({
    projects: catalog.projects,
    hostExtensions: await app.host.discover(),
    managed,
  });
  const plan = await app.prepare(
    planKitOperation({
      operation: "activate",
      kit: { id: "new-kit", projectIds: ["alpha"], origin: "personal" },
      catalog,
      inventory,
      managed,
      installedKits: app.kits.readInstalledStates(),
      activeKitId: "old-kit",
      catalogCanMutate: true,
    }),
  );
  app.setFingerprint(plan.inventoryFingerprint);
  const mutationWriteStarted = deferred<void>();
  const releaseMutationWrite = deferred<void>();
  const mutationWriteCounts: number[] = [];
  const writeJournal = app.executor.journal.write.bind(app.executor.journal);
  vi.spyOn(app.executor.journal, "write").mockImplementation(async (journal) => {
    const completedMutations = (journal as typeof journal & { completedMutations?: unknown[] })
      .completedMutations;
    if (completedMutations?.length) {
      mutationWriteCounts.push(completedMutations.length);
      if (completedMutations.length === 1) {
        mutationWriteStarted.resolve();
        await releaseMutationWrite.promise;
      }
    }
    await writeJournal(journal);
  });

  const executing = app.executor.execute(plan, approve(plan));
  await mutationWriteStarted.promise;
  expect(app.host.calls.some(({ operation }) => operation === "enable")).toBe(true);
  expect(app.host.calls.some(({ operation }) => operation === "disable")).toBe(false);
  releaseMutationWrite.resolve();
  const receipt = await executing;
  expect(receipt.outcome).toBe("completed");
  expect(receipt.reloadRequired).toBe(true);
  expect(app.kits.readActiveId()).toBe("new-kit");
  expect(app.host.reloadCount).toBe(0);
  expect(app.host.calls.map(({ operation }) => operation)).toEqual(
    expect.arrayContaining(["install", "enable", "disable"]),
  );
  expect(app.host.calls.map(({ operation }) => operation)).not.toContain("reload");
  expect(app.profile.read().operationReceipt).toEqual(receipt);
  expect(app.executor.journal.read()).toBeNull();
  expect(mutationWriteCounts).toEqual(expect.arrayContaining([1, 2]));
});

it("preserves the prior active identity when a required install fails", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const catalog = { ...catalogFixture(), projects: [alpha] };
  const app = await executorFixture(catalog);
  await app.recordInstalled("old-kit", []);
  await app.kits.setActive("old-kit");
  const plan = await app.prepare(
    planKitOperation({
      operation: "activate",
      kit: { id: "new-kit", projectIds: ["alpha"], origin: "personal" },
      catalog,
      inventory: await app.inventory(),
      managed: {},
      installedKits: app.kits.readInstalledStates(),
      activeKitId: "old-kit",
      catalogCanMutate: true,
    }),
  );
  app.setFingerprint(plan.inventoryFingerprint);
  const receipt = await app.executor.execute(plan, approve(plan));
  expect(receipt.outcome).toBe("partial");
  expect(app.kits.readActiveId()).toBe("old-kit");
  expect(
    app.host.calls.some(({ operation }) => operation === "enable" || operation === "disable"),
  ).toBe(false);
});
