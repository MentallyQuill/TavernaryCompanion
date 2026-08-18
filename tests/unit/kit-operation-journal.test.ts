import { expect, it } from "vitest";

import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { executorFixture, extension } from "../helpers/kit-executor-fixture";

it("recovers an interrupted journal without replaying mutations", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const app = await executorFixture(
    { ...catalogFixture(), projects: [alpha] },
    { extensions: [extension("Alpha")] },
  );
  await app.executor.journal.write({
    formatVersion: 1,
    operationId: "old-op",
    planId: "plan",
    operation: "activate",
    kitId: "writers",
    phase: "installing",
    startedAt: "2026-08-18T00:00:00.000Z",
    currentProjectId: "alpha",
    completedProjects: [],
    preOperationActiveKitId: "old-kit",
    requiredProjectIds: ["alpha"],
  });
  const receipt = await app.executor.recoverInterrupted();
  expect(receipt).toMatchObject({ outcome: "interrupted", previousActiveKitId: "old-kit" });
  expect(app.kits.readInstalled("writers")).toMatchObject({
    installedProjectIds: ["alpha"],
    missingProjectIds: [],
    status: "installed",
  });
  expect(app.host.calls.some(({ operation }) => operation === "install")).toBe(false);
  expect(app.executor.journal.read()).toBeNull();
});

it("records partial uninstall recovery as incomplete before clearing its journal", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const beta = catalogProjectFixture({ id: "beta", folderName: "Beta" });
  const app = await executorFixture(
    { ...catalogFixture(), projects: [alpha, beta] },
    { extensions: [extension("Alpha")] },
  );
  await app.recordInstalled("writers", ["alpha", "beta"]);
  await app.executor.journal.write({
    formatVersion: 1,
    operationId: "old-op",
    planId: "plan",
    operation: "uninstall",
    kitId: "writers",
    phase: "removing",
    startedAt: "2026-08-18T00:00:00.000Z",
    currentProjectId: "beta",
    completedProjects: [],
    preOperationActiveKitId: null,
    requiredProjectIds: ["alpha", "beta"],
  });

  await app.executor.recoverInterrupted();

  expect(app.kits.readInstalled("writers")).toMatchObject({
    installedProjectIds: ["alpha"],
    missingProjectIds: ["beta"],
    status: "incomplete",
  });
  expect(app.executor.journal.read()).toBeNull();
});

it("recovers a journal-required extension removed from the current catalog as missing", async () => {
  const app = await executorFixture({ ...catalogFixture(), projects: [] });
  await app.executor.journal.write({
    formatVersion: 1,
    operationId: "old-op",
    planId: "plan",
    operation: "install",
    kitId: "writers",
    phase: "installing",
    startedAt: "2026-08-18T00:00:00.000Z",
    currentProjectId: "alpha",
    completedProjects: [],
    preOperationActiveKitId: null,
    requiredProjectIds: ["alpha"],
  });

  await app.executor.recoverInterrupted();

  expect(app.kits.readInstalled("writers")).toMatchObject({
    installedProjectIds: [],
    missingProjectIds: ["alpha"],
    status: "incomplete",
  });
});
