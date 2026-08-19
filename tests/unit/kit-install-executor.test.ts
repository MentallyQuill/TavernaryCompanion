import { expect, it, vi } from "vitest";

import { planKitOperation } from "../../src/kits/kit-planner";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { approve, executorFixture, extension } from "../helpers/kit-executor-fixture";
import type { KitInstallTargetSelection } from "../../src/kits/kit-install-targets";
import { normalizeManagedExtensionMap } from "../../src/inventory/managed-registry";

it("continues independent installs, records verified ownership, and leaves an incomplete Kit", async () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const beta = catalogProjectFixture({ id: "beta", folderName: "Beta" });
  const catalog = { ...catalogFixture(), projects: [alpha, beta] };
  const app = await executorFixture(catalog, {
    installResults: { [beta.install!.repositoryUrl]: extension("Beta") },
  });
  const inventory = await app.inventory();
  const plan = await app.prepare(
    planKitOperation({
      operation: "install",
      kit: { id: "writers", projectIds: ["alpha", "beta"], origin: "personal" },
      catalog,
      inventory,
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: true,
    }),
  );
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
  const plan = await app.prepare(
    planKitOperation({
      operation: "install",
      kit: { id: "writers", projectIds: ["alpha"], origin: "personal" },
      catalog,
      inventory: await app.inventory(),
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: true,
    }),
  );
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

it("passes the chosen exact target to the verifier and journals its identity", async () => {
  const checkedSha = "a".repeat(40);
  const newestSha = "b".repeat(40);
  const alpha = scannedProject("alpha", "Alpha", checkedSha);
  const catalog = { ...catalogFixture(), projects: [alpha] };
  const app = await executorFixture(catalog, {
    capabilities: {
      pinnedCommitInstall: true,
      remoteRevisionLookup: true,
      localRevisionLookup: true,
    },
    remoteHeads: { [`${alpha.install!.repositoryUrl}#`]: newestSha },
    installResults: { [alpha.install!.repositoryUrl]: extension("Alpha") },
  });
  const plan = await app.prepare(
    planKitOperation({
      operation: "install",
      kit: { id: "checked-kit", projectIds: ["alpha"], origin: "personal" },
      catalog,
      inventory: await app.inventory(),
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: true,
    }),
  );
  const choice = plan.install[0].targetChoice;
  if (choice?.kind !== "choose") throw new Error("Expected a target choice.");
  const selected: KitInstallTargetSelection[] = [
    { projectId: "alpha", target: choice.checked.target },
  ];
  app.setFingerprint(plan.inventoryFingerprint);
  const originalInstall = app.host.install.bind(app.host);
  let journalTarget: string | null | undefined;
  vi.spyOn(app.host, "install").mockImplementation(async (input) => {
    journalTarget = app.executor.journal.read()?.selectedInstallTargets?.[0]?.target.requestedSha;
    await originalInstall(input);
  });

  const receipt = await app.executor.execute(plan, approve(plan, selected));

  expect(app.host.calls).toContainEqual(
    expect.objectContaining({ operation: "install", commitSha: checkedSha }),
  );
  expect(journalTarget).toBe(checkedSha);
  expect(receipt.projects[0]).toMatchObject({
    status: "verified",
    installProvenance: {
      targetKind: "checked",
      requestedSha: checkedSha,
      installedSha: checkedSha,
    },
  });
  expect(
    normalizeManagedExtensionMap(app.profile.read().managedExtensions).alpha.provenance,
  ).toMatchObject({
    targetKind: "checked",
    requestedSha: checkedSha,
  });
});

it("stops a Kit after unavailable Checked is cancelled and leaves later projects untouched", async () => {
  const checkedSha = "a".repeat(40);
  const newestSha = "b".repeat(40);
  const first = catalogProjectFixture({ id: "first", folderName: "First" });
  const blocked = scannedProject("blocked", "Blocked", checkedSha);
  const later = catalogProjectFixture({ id: "later", folderName: "Later" });
  const catalog = { ...catalogFixture(), projects: [first, blocked, later] };
  const app = await executorFixture(catalog, {
    capabilities: {
      pinnedCommitInstall: true,
      remoteRevisionLookup: true,
      localRevisionLookup: true,
    },
    remoteHeads: {
      [`${first.install!.repositoryUrl}#`]: newestSha,
      [`${blocked.install!.repositoryUrl}#`]: newestSha,
      [`${later.install!.repositoryUrl}#`]: newestSha,
    },
    unavailableHashes: [checkedSha],
    installResults: {
      [first.install!.repositoryUrl]: extension("First"),
      [blocked.install!.repositoryUrl]: extension("Blocked"),
      [later.install!.repositoryUrl]: extension("Later"),
    },
  });
  const plan = await app.prepare(
    planKitOperation({
      operation: "install",
      kit: { id: "mixed", projectIds: ["first", "blocked", "later"], origin: "personal" },
      catalog,
      inventory: await app.inventory(),
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: true,
    }),
  );
  const blockedChoice = plan.install.find(({ projectId }) => projectId === "blocked")?.targetChoice;
  if (blockedChoice?.kind !== "choose") throw new Error("Expected a target choice.");
  const selected = [
    ...plan.install
      .filter(({ targetChoice }) => targetChoice?.kind === "single")
      .map(({ projectId, targetChoice }) => ({
        projectId,
        target: targetChoice!.kind === "single" ? targetChoice!.target : blockedChoice.newest,
      })),
    { projectId: "blocked", target: blockedChoice.checked.target },
  ];
  app.setFingerprint(plan.inventoryFingerprint);

  const executing = app.executor.execute(plan, approve(plan, selected));
  await vi.waitFor(() => expect(app.fallbacks.read()?.projectId).toBe("blocked"));
  expect(app.fallbacks.read()?.newest.target).toMatchObject({
    kind: "newest",
    requestedSha: newestSha,
  });
  app.fallbacks.cancel();
  const receipt = await executing;

  expect(receipt.projects).toEqual([
    expect.objectContaining({ projectId: "first", status: "verified" }),
    expect.objectContaining({ projectId: "blocked", status: "failed" }),
    expect.objectContaining({ projectId: "later", status: "untouched", retryable: true }),
  ]);
  expect(
    app.host.calls
      .filter(({ operation }) => operation === "install")
      .map(({ repositoryUrl }) => repositoryUrl),
  ).toEqual([first.install!.repositoryUrl, blocked.install!.repositoryUrl]);
  expect(app.profile.read().managedExtensions.first).toBeTruthy();
  expect(app.profile.read().managedExtensions.later).toBeUndefined();
});

it("accepts a freshly resolved Newest fallback and reruns target-aware trust", async () => {
  const checkedSha = "a".repeat(40);
  const newestSha = "b".repeat(40);
  const alpha = scannedProject("alpha", "Alpha", checkedSha);
  alpha.tavernKeeper!.riskLevel = "material";
  alpha.tavernKeeper!.report!.riskLevel = "material";
  const catalog = { ...catalogFixture(), projects: [alpha] };
  const confirm = vi.fn(async () => true);
  const app = await executorFixture(
    catalog,
    {
      capabilities: {
        pinnedCommitInstall: true,
        remoteRevisionLookup: true,
        localRevisionLookup: true,
      },
      remoteHeads: { [`${alpha.install!.repositoryUrl}#`]: newestSha },
      unavailableHashes: [checkedSha],
      installResults: { [alpha.install!.repositoryUrl]: extension("Alpha") },
    },
    { confirm },
  );
  await app.profile.update((draft) => {
    draft.trustAcknowledgedAt = "2026-08-18T00:00:00.000Z";
  });
  const plan = await app.prepare(
    planKitOperation({
      operation: "install",
      kit: { id: "fallback", projectIds: ["alpha"], origin: "personal" },
      catalog,
      inventory: await app.inventory(),
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: true,
    }),
  );
  const choice = plan.install[0].targetChoice;
  if (choice?.kind !== "choose") throw new Error("Expected a target choice.");
  app.setFingerprint(plan.inventoryFingerprint);

  const executing = app.executor.execute(
    plan,
    approve(plan, [{ projectId: "alpha", target: choice.checked.target }]),
  );
  await vi.waitFor(() => expect(app.fallbacks.read()).not.toBeNull());
  app.fallbacks.respond(app.fallbacks.read()!.newest);
  const receipt = await executing;

  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "assessment-warning", stale: true }),
    alpha,
  );
  expect(
    app.host.calls
      .filter(({ operation }) => operation === "install")
      .map(({ commitSha }) => commitSha),
  ).toEqual([checkedSha, newestSha]);
  expect(receipt.projects[0]).toMatchObject({
    status: "verified",
    installProvenance: { targetKind: "newest", requestedSha: newestSha },
  });
});

it("does not count a failed-verification leftover as an installed Kit member", async () => {
  const newestSha = "b".repeat(40);
  const wrongSha = "c".repeat(40);
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  const catalog = { ...catalogFixture(), projects: [alpha] };
  const app = await executorFixture(catalog, {
    capabilities: {
      pinnedCommitInstall: true,
      remoteRevisionLookup: true,
      localRevisionLookup: true,
    },
    remoteHeads: { [`${alpha.install!.repositoryUrl}#`]: newestSha },
    mismatchResults: { [newestSha]: wrongSha },
    failures: { remove: new Error("cleanup failed") },
    installResults: { [alpha.install!.repositoryUrl]: extension("Alpha") },
  });
  const plan = await app.prepare(
    planKitOperation({
      operation: "install",
      kit: { id: "mismatch", projectIds: ["alpha"], origin: "personal" },
      catalog,
      inventory: await app.inventory(),
      managed: {},
      installedKits: [],
      activeKitId: null,
      catalogCanMutate: true,
    }),
  );
  app.setFingerprint(plan.inventoryFingerprint);

  const receipt = await app.executor.execute(plan, approve(plan));

  expect(receipt.projects[0]).toMatchObject({
    status: "failed",
    message: "The install didn't finish correctly, and cleanup needs attention in SillyTavern.",
  });
  expect(app.kits.readInstalled("mismatch")).toMatchObject({
    installedProjectIds: [],
    missingProjectIds: ["alpha"],
    status: "incomplete",
  });
  expect(normalizeManagedExtensionMap(app.profile.read().managedExtensions).alpha).toBeUndefined();
  expect(app.host.reloadCount).toBe(1);
});

function scannedProject(id: string, folderName: string, scannedSha: string) {
  const project = catalogProjectFixture({ id, folderName });
  project.tavernKeeper = {
    state: "orange",
    riskLevel: "low",
    freshness: "stale",
    currentSha: "b".repeat(40),
    history: [],
    historyUrl: null,
    report: {
      reportId: `report-${id}`,
      riskLevel: "low",
      headline: "Checked",
      summary: "Checked",
      minorCautions: 0,
      materialConcerns: 0,
      highDanger: 0,
      maliciousEvidence: "none",
      citedFindingIds: [],
      scannedSha,
      treeUrl: `https://example.com/${id}/tree`,
      scannedAt: "2026-08-17T00:00:00.000Z",
      assessedAt: "2026-08-17T00:01:00.000Z",
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "fixture",
      dangerBasis: "none",
      assessmentSource: "model",
      reportUrl: `https://example.com/${id}/scan`,
      technicalHistoryUrl: null,
    },
  };
  return project;
}
