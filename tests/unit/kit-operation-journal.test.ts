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
  expect(app.host.calls.some(({ operation }) => operation === "install")).toBe(false);
  expect(app.executor.journal.read()).toBeNull();
});
