import { expect, it } from "vitest";

import { planKitOperation } from "../../src/kits/kit-planner";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { approve, executorFixture, extension } from "../helpers/kit-executor-fixture";

it("continues independent installs, records verified ownership, and leaves an incomplete Kit", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const beta = catalogProjectFixture({ id: "beta", folderName: "Beta" });
  const catalog = { ...catalogFixture(), projects: [alpha, beta] };
  const app = await executorFixture(catalog, {
    installResults: { [beta.install!.repositoryUrl]: extension("Beta") },
  });
  const inventory = await app.inventory();
  const plan = planKitOperation({
    operation: "install",
    kit: { id: "writers", projectIds: ["alpha", "beta"], origin: "personal" },
    catalog,
    inventory,
    managed: {},
    installedKits: [],
    activeKitId: null,
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  const receipt = await app.executor.execute(plan, approve(plan));
  expect(
    app.host.calls
      .filter(({ operation }) => operation === "install")
      .map(({ repositoryUrl }) => repositoryUrl),
  ).toEqual([alpha.install!.repositoryUrl, beta.install!.repositoryUrl]);
  expect(receipt.projects).toEqual([
    expect.objectContaining({ projectId: "alpha", status: "failed" }),
    expect.objectContaining({ projectId: "beta", status: "verified" }),
  ]);
  expect(app.kits.readInstalled("writers")?.status).toBe("incomplete");
  expect(app.profile.read().managedExtensions.beta).toBeTruthy();
  expect(app.profile.read().managedExtensions.alpha).toBeUndefined();
  expect(app.executor.journal.read()).toBeNull();
});

it("rejects stale plans before mutating the host", async () => {
  const catalog = catalogFixture();
  const app = await executorFixture(catalog);
  const plan = planKitOperation({
    operation: "install",
    kit: { id: "empty", projectIds: [], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed: {},
    installedKits: [],
    activeKitId: null,
    catalogCanMutate: true,
  });
  app.setFingerprint("changed");
  await expect(app.executor.execute(plan, approve(plan))).rejects.toThrow("stale");
});

it("checks the approved inventory after acquiring the operation lock", async () => {
  const catalog = catalogFixture();
  const app = await executorFixture(catalog);
  const plan = planKitOperation({
    operation: "install",
    kit: { id: "empty", projectIds: [], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed: {},
    installedKits: [],
    activeKitId: null,
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  await app.executor.execute(plan, approve(plan));

  expect(app.fingerprintCheckOperations).toEqual([`kit:${plan.id}`]);
});

it("rejects a catalog-content change after approval before installing", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const catalog = { ...catalogFixture(), projects: [alpha] };
  const app = await executorFixture(catalog, {
    installResults: { [alpha.install!.repositoryUrl]: extension("Alpha") },
  });
  const plan = planKitOperation({
    operation: "install",
    kit: { id: "writers", projectIds: ["alpha"], origin: "personal" },
    catalog,
    inventory: await app.inventory(),
    managed: {},
    installedKits: [],
    activeKitId: null,
    catalogCanMutate: true,
  });
  app.setFingerprint(plan.inventoryFingerprint);
  app.setCatalog({
    ...catalog,
    projects: [
      {
        ...alpha,
        install: { ...alpha.install!, repositoryUrl: "https://github.com/example/replaced.git" },
      },
    ],
  });

  await expect(app.executor.execute(plan, approve(plan))).rejects.toThrow("catalog");
  expect(app.host.calls.some(({ operation }) => operation === "install")).toBe(false);
});
