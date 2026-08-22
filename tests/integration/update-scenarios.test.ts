import { expect, it, vi } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import type { InventorySnapshot } from "../../src/inventory/inventory-types";
import { OperationLock } from "../../src/lifecycle/operation-lock";
import { ProfileStore } from "../../src/state/profile-store";
import { createExtensionUpdateCoordinator } from "../../src/updates/update-coordinator";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { createFakeHost } from "../helpers/fake-host";

it("updates an external checkout through scanned and newest forward targets without adopting it", async () => {
  const installedSha = "1".repeat(40);
  const checkedSha = "2".repeat(40);
  const newestSha = "3".repeat(40);
  const project = catalogProjectFixture();
  project.tavernKeeper = {
    state: "teal",
    riskLevel: "low",
    freshness: "stale",
    currentSha: newestSha,
    report: {
      reportId: "report-alpha",
      riskLevel: "low",
      headline: "Checked",
      summary: "Checked",
      minorCautions: 0,
      materialConcerns: 0,
      highDanger: 0,
      maliciousEvidence: "none",
      citedFindingIds: [],
      scannedSha: checkedSha,
      treeUrl: "https://example.test/tree",
      scannedAt: "2026-08-18T00:00:00.000Z",
      assessedAt: "2026-08-18T00:00:00.000Z",
      scannerPolicyVersion: "5",
      contextualReviewPolicyVersion: "1",
      synthesisPolicyVersion: "1",
      synthesisModel: "test",
      dangerBasis: "none",
      assessmentSource: "model",
      reportUrl: "https://example.test/report",
      technicalHistoryUrl: null,
      javascriptAnalysisStatus: "complete",
    },
    history: [],
    historyUrl: null,
  };
  const extension = {
    internalName: "third-party/Alpha",
    folderName: "Alpha",
    enabled: true,
    type: "local" as const,
    manifest: null,
  };
  const catalog = catalogFixture();
  catalog.projects = [project];
  const snapshot: CatalogSnapshot = {
    state: "ready-current",
    canMutate: true,
    checkedAt: null,
    catalog,
  };
  const inventory: InventorySnapshot = {
    managed: [],
    external: [{ project, extension }],
    unknown: [],
    missingManaged: [],
  };
  const host = createFakeHost({
    extensions: [extension],
    installedRevisions: { "local:third-party/Alpha": installedSha },
    updateInspections: {
      "local:third-party/Alpha": {
        installedSha,
        newestSha,
        remoteUrl: project.install!.repositoryUrl,
        branch: "main",
        worktreeClean: true,
        branchMatches: true,
        exactUpdateSupported: true,
        newestRelationship: "behind",
        candidateRelationships: { [checkedSha]: "behind" },
      },
    },
  });
  const store = new ProfileStore({ extensionSettings: {}, saveSettings: vi.fn() });
  const coordinator = createExtensionUpdateCoordinator({
    host,
    store,
    lock: new OperationLock(),
    getSnapshot: () => snapshot,
    getInventory: () => inventory,
    confirm: vi.fn(async () => true),
    now: () => "2026-08-19T12:00:00.000Z",
    createId: () => crypto.randomUUID(),
  });

  await coordinator.check("alpha");
  const checked = coordinator
    .prepare("alpha")
    .selections.find(({ target }) => target.kind === "checked");
  if (!checked) throw new Error("Expected checked target.");
  await coordinator.update(checked);
  const newest = coordinator
    .prepare("alpha")
    .selections.find(({ target }) => target.kind === "newest");
  if (!newest) throw new Error("Expected newest target.");
  await coordinator.update(newest);

  expect(
    host.calls
      .filter(({ operation }) => operation === "applyUpdate")
      .map(({ targetSha }) => targetSha),
  ).toEqual([checkedSha, newestSha]);
  expect(coordinator.read().states.alpha).toEqual({ kind: "current" });
  expect(store.read().managedExtensions).toEqual({});
});
