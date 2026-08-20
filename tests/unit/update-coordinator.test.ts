import { describe, expect, it, vi } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import type { InventorySnapshot } from "../../src/inventory/inventory-types";
import { HostOperationError } from "../../src/host/host-errors";
import { OperationLock } from "../../src/lifecycle/operation-lock";
import { COMPANION_PROJECT_ID } from "../../src/lifecycle/self-protection";
import { ProfileStore } from "../../src/state/profile-store";
import type { TrustPrompt } from "../../src/trust/trust-types";
import { createExtensionUpdateCoordinator } from "../../src/updates/update-coordinator";
import type { HostUpdateInspection } from "../../src/updates/update-types";
import { catalogFixture, catalogProjectFixture, deferred } from "../helpers/catalog-fixtures";
import { createFakeHost, type FakeHostOptions } from "../helpers/fake-host";

const installedSha = "1".repeat(40);
const newestSha = "2".repeat(40);
const checkedSha = "3".repeat(40);

function attachMaterialReport(project: ReturnType<typeof catalogProjectFixture>): void {
  project.tavernKeeper = {
    state: "orange",
    riskLevel: "material",
    freshness: "stale",
    currentSha: newestSha,
    report: {
      reportId: "report-alpha",
      riskLevel: "material",
      headline: "Checked",
      summary: "Checked",
      minorCautions: 0,
      materialConcerns: 1,
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
    },
    history: [],
    historyUrl: null,
  };
}

function setup(hostOverrides: FakeHostOptions = {}) {
  const project = catalogProjectFixture();
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
        candidateRelationships: {},
      },
    },
    ...hostOverrides,
  });
  const store = new ProfileStore({ extensionSettings: {}, saveSettings: vi.fn() });
  const confirm = vi.fn(async (prompt: TrustPrompt) => {
    void prompt;
    return true;
  });
  const coordinator = createExtensionUpdateCoordinator({
    host,
    store,
    lock: new OperationLock(),
    getSnapshot: () => snapshot,
    getInventory: () => inventory,
    confirm,
    now: () => "2026-08-19T12:00:00.000Z",
    createId: () => "update-1",
  });
  return { confirm, coordinator, host, inventory, project, snapshot, store };
}

describe("ExtensionUpdateCoordinator", () => {
  it("checks a catalog-matched external extension and exposes a forward newest target", async () => {
    const { coordinator } = setup();

    await coordinator.check("alpha");

    expect(coordinator.read().states.alpha).toMatchObject({
      kind: "available",
      notice: null,
      targets: [{ kind: "newest", requestedSha: newestSha }],
    });
  });

  it("explains when SillyTavern cannot provide safe exact updates", async () => {
    const { coordinator } = setup({
      failures: {
        inspectUpdate: new HostOperationError(
          "inspectUpdate",
          "This version of SillyTavern cannot check updates safely.",
          { status: 404 },
        ),
      },
    });

    await coordinator.check("alpha");

    expect(coordinator.read().states.alpha).toEqual({
      kind: "attention",
      reason: "This SillyTavern build does not support exact Companion updates.",
    });
  });

  it("does not check Tavernary Companion itself", async () => {
    const { coordinator, host, project } = setup();
    project.id = COMPANION_PROJECT_ID;

    await coordinator.checkAll();

    expect(host.calls.filter(({ operation }) => operation === "inspectUpdate")).toEqual([]);
    expect(coordinator.read()).toEqual({ states: {} });
  });

  it("publishes checking and completed states to page subscribers", async () => {
    const { coordinator } = setup();
    const observed: Array<string | undefined> = [];

    const unsubscribe = coordinator.subscribe((snapshot) => {
      observed.push(snapshot.states.alpha?.kind);
    });
    await coordinator.check("alpha");
    unsubscribe();

    expect(observed).toEqual(["checking", "available"]);
  });

  it("checks at most three installed repositories concurrently", async () => {
    const ids = ["alpha", "beta", "gamma", "delta"];
    const projects = ids.map((id) => catalogProjectFixture({ id, folderName: id }));
    const extensions = ids.map((id) => ({
      internalName: `third-party/${id}`,
      folderName: id,
      enabled: true,
      type: "local" as const,
      manifest: null,
    }));
    const catalog = catalogFixture();
    catalog.projects = projects;
    const snapshot: CatalogSnapshot = {
      state: "ready-current",
      canMutate: true,
      checkedAt: null,
      catalog,
    };
    const inventory: InventorySnapshot = {
      managed: [],
      external: projects.map((project, index) => ({ project, extension: extensions[index] })),
      unknown: [],
      missingManaged: [],
    };
    const host = createFakeHost({ extensions });
    const gates = ids.map(() => deferred<void>());
    let active = 0;
    let maximumActive = 0;
    vi.spyOn(host, "inspectUpdate").mockImplementation(async ({ internalName }) => {
      const index = extensions.findIndex((extension) => extension.internalName === internalName);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await gates[index].promise;
      active -= 1;
      const project = projects[index];
      return {
        installedSha,
        newestSha: installedSha,
        remoteUrl: project.install!.repositoryUrl,
        branch: "main",
        worktreeClean: true,
        branchMatches: true,
        exactUpdateSupported: true,
        newestRelationship: "equal",
        candidateRelationships: {},
      } satisfies HostUpdateInspection;
    });
    const coordinator = createExtensionUpdateCoordinator({
      host,
      store: new ProfileStore({ extensionSettings: {}, saveSettings: vi.fn() }),
      lock: new OperationLock(),
      getSnapshot: () => snapshot,
      getInventory: () => inventory,
      confirm: vi.fn(async () => true),
    });

    const checking = coordinator.checkAll();
    await vi.waitFor(() => expect(active).toBe(3));
    gates.forEach(({ resolve }) => resolve());
    await checking;

    expect(maximumActive).toBe(3);
    expect(Object.values(coordinator.read().states).map(({ kind }) => kind)).toEqual([
      "current",
      "current",
      "current",
      "current",
    ]);
  });

  it("invalidates session update evidence after inventory or catalog changes", async () => {
    const { coordinator } = setup();
    await coordinator.check("alpha");

    coordinator.invalidate();

    expect(coordinator.read()).toEqual({ states: {} });
  });

  it("discards an in-flight check result after invalidation", async () => {
    const { coordinator, host, project } = setup();
    const inspection = deferred<HostUpdateInspection>();
    vi.spyOn(host, "inspectUpdate").mockReturnValue(inspection.promise);

    const checking = coordinator.check("alpha");
    coordinator.invalidate();
    inspection.resolve({
      installedSha,
      newestSha,
      remoteUrl: project.install!.repositoryUrl,
      branch: "main",
      worktreeClean: true,
      branchMatches: true,
      exactUpdateSupported: true,
      newestRelationship: "behind",
      candidateRelationships: {},
    });
    await checking;

    expect(coordinator.read()).toEqual({ states: {} });
  });

  it("keeps the newest result when checks for one extension finish out of order", async () => {
    const { coordinator, host, project } = setup();
    const older = deferred<HostUpdateInspection>();
    const newer = deferred<HostUpdateInspection>();
    vi.spyOn(host, "inspectUpdate")
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);

    const firstCheck = coordinator.check("alpha");
    const secondCheck = coordinator.check("alpha");
    newer.resolve({
      installedSha: newestSha,
      newestSha,
      remoteUrl: project.install!.repositoryUrl,
      branch: "main",
      worktreeClean: true,
      branchMatches: true,
      exactUpdateSupported: true,
      newestRelationship: "equal",
      candidateRelationships: {},
    });
    await secondCheck;
    older.resolve({
      installedSha,
      newestSha,
      remoteUrl: project.install!.repositoryUrl,
      branch: "main",
      worktreeClean: true,
      branchMatches: true,
      exactUpdateSupported: true,
      newestRelationship: "behind",
      candidateRelationships: {},
    });
    await firstCheck;

    expect(coordinator.read().states.alpha).toEqual({ kind: "current" });
  });

  it("prepares immutable selections from the last successful check", async () => {
    const { coordinator } = setup();
    await coordinator.check("alpha");

    const prepared = coordinator.prepare("alpha");

    expect(prepared).toMatchObject({
      notice: null,
      selections: [
        {
          target: { kind: "newest", requestedSha: newestSha },
          binding: {
            projectId: "alpha",
            catalogGeneratedAt: "2026-08-18T00:00:00.000Z",
            internalName: "third-party/Alpha",
            installedSha,
            requestedSha: newestSha,
          },
        },
      ],
    });
  });

  it("rejects a prepared target when the installed commit changes before execution", async () => {
    const { coordinator, host, project } = setup();
    await coordinator.check("alpha");
    const selection = coordinator.prepare("alpha").selections[0];
    vi.spyOn(host, "inspectUpdate").mockResolvedValue({
      installedSha: "9".repeat(40),
      newestSha,
      remoteUrl: project.install!.repositoryUrl,
      branch: "main",
      worktreeClean: true,
      branchMatches: true,
      exactUpdateSupported: true,
      newestRelationship: "behind",
      candidateRelationships: {},
    });

    await expect(coordinator.update(selection)).rejects.toThrow(
      "This update choice is out of date. Check again.",
    );
    expect(host.calls.some(({ operation }) => operation === "applyUpdate")).toBe(false);
  });

  it("publishes fresh attention evidence when local changes appear before execution", async () => {
    const { coordinator, host, project } = setup();
    await coordinator.check("alpha");
    const selection = coordinator.prepare("alpha").selections[0];
    vi.spyOn(host, "inspectUpdate").mockResolvedValue({
      installedSha,
      newestSha,
      remoteUrl: project.install!.repositoryUrl,
      branch: "main",
      worktreeClean: false,
      branchMatches: true,
      exactUpdateSupported: true,
      newestRelationship: "behind",
      candidateRelationships: {},
    });

    await expect(coordinator.update(selection)).rejects.toThrow(
      "This update choice is out of date. Check again.",
    );
    expect(coordinator.read().states.alpha).toEqual({
      kind: "attention",
      reason: "This extension has local changes. Manage it in SillyTavern.",
    });
    expect(host.calls.some(({ operation }) => operation === "applyUpdate")).toBe(false);
  });

  it("updates an external extension exactly without adopting its ownership", async () => {
    const { coordinator, host, store } = setup();
    await coordinator.check("alpha");
    const selection = coordinator.prepare("alpha").selections[0];

    const receipt = await coordinator.update(selection);

    expect(host.calls).toContainEqual(
      expect.objectContaining({
        operation: "applyUpdate",
        expectedCurrentSha: installedSha,
        targetSha: newestSha,
      }),
    );
    expect(host.calls).toContainEqual(
      expect.objectContaining({
        operation: "readLocalRevision",
        internalName: "third-party/Alpha",
      }),
    );
    expect(receipt).toMatchObject({
      id: "update-1",
      kind: "update",
      status: "succeeded",
      reloadRequired: true,
      installProvenance: {
        targetKind: "newest",
        requestedSha: newestSha,
        installedSha: newestSha,
      },
    });
    expect(store.read().managedExtensions.alpha).toBeUndefined();
    expect(store.read().operationReceipt).toBeNull();
  });

  it("marks an extension for attention when post-update revision verification mismatches", async () => {
    const mismatchedSha = "8".repeat(40);
    const { coordinator } = setup({ mismatchResults: { [newestSha]: mismatchedSha } });
    await coordinator.check("alpha");
    const selection = coordinator.prepare("alpha").selections[0];

    const receipt = await coordinator.update(selection);

    expect(receipt).toMatchObject({
      kind: "update",
      status: "verification-failed",
      reloadRequired: false,
      installProvenance: { requestedSha: newestSha, installedSha: mismatchedSha },
    });
    expect(coordinator.read().states.alpha).toEqual({
      kind: "attention",
      reason: "The installed version did not match the selected update. Manage it in SillyTavern.",
    });
  });

  it("returns a safe failed receipt when the host rejects the update", async () => {
    const { coordinator } = setup({ failures: { applyUpdate: new Error("private host failure") } });
    await coordinator.check("alpha");
    const selection = coordinator.prepare("alpha").selections[0];

    const receipt = await coordinator.update(selection);

    expect(receipt).toMatchObject({
      kind: "update",
      status: "failed",
      reloadRequired: false,
      safeError: "SillyTavern did not complete the extension update.",
    });
    expect(JSON.stringify(receipt)).not.toContain("private host failure");
  });

  it("publishes fresh attention evidence after a rejected update request", async () => {
    const { coordinator, host } = setup({
      failures: { applyUpdate: new Error("private host failure") },
    });
    await coordinator.check("alpha");
    const inspectUpdate = host.inspectUpdate.bind(host);
    let inspections = 0;
    vi.spyOn(host, "inspectUpdate").mockImplementation(async (input) => {
      const inspection = await inspectUpdate(input);
      inspections += 1;
      return inspections === 2 ? { ...inspection, worktreeClean: false } : inspection;
    });

    const receipt = await coordinator.update(coordinator.prepare("alpha").selections[0]);

    expect(receipt.status).toBe("failed");
    expect(coordinator.read().states.alpha).toEqual({
      kind: "attention",
      reason: "This extension has local changes. Manage it in SillyTavern.",
    });
  });

  it("verifies the installed commit when the host applies an update but loses its response", async () => {
    const { coordinator, host } = setup();
    await coordinator.check("alpha");
    const selection = coordinator.prepare("alpha").selections[0];
    const applyUpdate = host.applyUpdate.bind(host);
    vi.spyOn(host, "applyUpdate").mockImplementation(async (input) => {
      await applyUpdate(input);
      throw new Error("response lost");
    });

    const receipt = await coordinator.update(selection);

    expect(receipt).toMatchObject({
      status: "succeeded",
      installProvenance: { requestedSha: newestSha, installedSha: newestSha },
    });
  });

  it("returns an attention receipt when post-update discovery cannot verify the result", async () => {
    const { coordinator } = setup({ failures: { discover: new Error("private path") } });
    await coordinator.check("alpha");

    const receipt = await coordinator.update(coordinator.prepare("alpha").selections[0]);

    expect(receipt).toMatchObject({
      status: "verification-failed",
      safeError: "Companion could not verify the installed extension after updating.",
      reloadRequired: false,
    });
    expect(JSON.stringify(receipt)).not.toContain("private path");
    expect(coordinator.read().states.alpha).toEqual({
      kind: "attention",
      reason: "Companion could not verify the installed version. Manage it in SillyTavern.",
    });
  });

  it("reports a verified update when its profile record cannot be saved", async () => {
    const { coordinator, store } = setup();
    await coordinator.check("alpha");
    vi.spyOn(store, "update").mockRejectedValueOnce(new Error("private settings failure"));

    const receipt = await coordinator.update(coordinator.prepare("alpha").selections[0]);

    expect(receipt).toMatchObject({
      status: "updated-unrecorded",
      safeError:
        "The extension was updated and verified, but Companion could not save its update record. Reopen Companion to reconcile it.",
      reloadRequired: true,
    });
    expect(JSON.stringify(receipt)).not.toContain("private settings failure");
  });

  it("rechecks after a scanned update and keeps a newer creator update available", async () => {
    const { coordinator, project } = setup({
      updateInspections: {
        "local:third-party/Alpha": {
          installedSha,
          newestSha,
          remoteUrl: "https://github.com/example/Alpha.git",
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: { [checkedSha]: "behind" },
        },
      },
    });
    attachMaterialReport(project);
    await coordinator.check("alpha");
    const selection = coordinator
      .prepare("alpha")
      .selections.find(({ target }) => target.kind === "checked");
    if (!selection) throw new Error("Expected a checked update selection.");

    await coordinator.update(selection);

    expect(coordinator.read().states.alpha).toMatchObject({
      kind: "available",
      targets: [{ kind: "newest", requestedSha: newestSha }],
    });
  });

  it("uses the existing target-aware assessment prompt for a scanned update", async () => {
    const { confirm, coordinator, project } = setup({
      updateInspections: {
        "local:third-party/Alpha": {
          installedSha,
          newestSha,
          remoteUrl: "https://github.com/example/Alpha.git",
          branch: "main",
          worktreeClean: true,
          branchMatches: true,
          exactUpdateSupported: true,
          newestRelationship: "behind",
          candidateRelationships: { [checkedSha]: "behind" },
        },
      },
    });
    attachMaterialReport(project);
    await coordinator.check("alpha");
    const selection = coordinator
      .prepare("alpha")
      .selections.find(({ target }) => target.kind === "checked");
    if (!selection) throw new Error("Expected a checked update selection.");

    await coordinator.update(selection);

    expect(confirm.mock.calls.map(([prompt]) => prompt)).toMatchObject([
      { kind: "unsandboxed-disclosure" },
      { kind: "assessment-warning", severity: "material", stale: false },
    ]);
  });

  it("refreshes provenance without changing managed ownership fields", async () => {
    const { coordinator, inventory, project, store } = setup();
    const extension = inventory.external[0].extension;
    const record = {
      projectId: "alpha",
      internalName: extension.internalName,
      folderName: extension.folderName,
      installedAt: "2026-08-01T00:00:00.000Z",
      installedBy: "kit" as const,
    };
    inventory.external = [];
    inventory.managed = [{ project, extension, record }];
    await store.update((draft) => {
      draft.managedExtensions.alpha = record;
    });
    await coordinator.check("alpha");

    await coordinator.update(coordinator.prepare("alpha").selections[0]);

    expect(store.read().managedExtensions.alpha).toMatchObject({
      projectId: "alpha",
      installedAt: "2026-08-01T00:00:00.000Z",
      installedBy: "kit",
      provenance: {
        targetKind: "newest",
        requestedSha: newestSha,
        installedSha: newestSha,
      },
    });
  });
});
